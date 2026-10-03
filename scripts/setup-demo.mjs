import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { config as loadEnv } from "dotenv";
loadEnv({ quiet: true });
const databaseKeys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
];
const hasCloudDatabase = databaseKeys.some((key) => {
  const raw = process.env[key]?.trim();
  if (!raw) return false;
  try {
    return new URL(raw).hostname !== "127.0.0.1";
  } catch {
    throw new Error(`Invalid database config: ${key}`);
  }
});
if (
  process.env.VERCEL === "1" ||
  (process.env.APP_MODE && process.env.APP_MODE !== "prototype") ||
  hasCloudDatabase
)
  throw new Error(
    "setup:demo only supports local prototype PostgreSQL; use db:migrate for cloud databases",
  );
fs.mkdirSync(".local", { recursive: true });
if (!fs.existsSync(".env")) {
  const secret = () => randomBytes(32).toString("hex");
  const password = secret();
  fs.writeFileSync(
    ".env",
    `APP_MODE=prototype\nSITE_URL=http://127.0.0.1:3000\nDATABASE_URL=postgresql://dongho:${password}@127.0.0.1:54329/dongho\nAUTH_SECRET=${secret()}\nAUTH_TRUST_HOST=true\nPII_ENCRYPTION_KEY=${secret()}\nCRON_SECRET=${secret()}\nMAIL_MODE=local\nMAIL_FROM=studio@example.invalid\nADMIN_NOTIFY_EMAIL=admin@example.invalid\nNEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA\nTURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA\n`,
  );
}
const online = () =>
  new Promise((resolve) => {
    const socket = net.connect(54329, "127.0.0.1");
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
if (!(await online())) {
  const log = fs.openSync(".local/database.log", "a");
  const child = spawn(process.execPath, ["scripts/local-db.mjs"], {
    detached: true,
    stdio: ["ignore", log, log],
    windowsHide: true,
  });
  child.unref();
  for (let i = 0; i < 60 && !(await online()); i++)
    await new Promise((resolve) => setTimeout(resolve, 500));
  if (!(await online()))
    throw new Error("Local Postgres did not start. See .local/database.log");
}
function run(args) {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`Setup step failed: ${args[0]}`);
}
run(["node_modules/prisma/build/index.js", "generate"]);
run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
run(["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"]);
if (!fs.existsSync("public/tour/assets.json"))
  run(["scripts/prepare-source-assets.mjs"]);
if (!fs.existsSync("public/tour/tour.json"))
  run(["scripts/configure-tour.mjs"]);
run(["node_modules/tsx/dist/cli.mjs", "scripts/import-source-content.ts"]);
if (!fs.existsSync(".local/demo-access.txt"))
  run([
    "node_modules/tsx/dist/cli.mjs",
    "scripts/create-admin.ts",
    "admin@example.invalid",
  ]);
console.log(
  "Local prototype ready. Admin access: .local/demo-access.txt (private, not committed).",
);
