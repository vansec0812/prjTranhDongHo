import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { spawnSync } from "node:child_process";
const url = new URL(process.env.DATABASE_URL);
if (process.env.APP_MODE !== "prototype" || url.hostname !== "127.0.0.1")
  throw new Error(
    "Test preparation only operates on the local prototype cluster",
  );
const pg = new EmbeddedPostgres({
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port),
  persistent: true,
});
const client = pg.getPgClient("postgres");
await client.connect();
const existing = await client.query(
  "SELECT 1 FROM pg_database WHERE datname=$1",
  ["dongho_test"],
);
if (!existing.rowCount) await client.query("CREATE DATABASE dongho_test");
await client.end();
url.pathname = "/dongho_test";
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    stdio: "inherit",
    windowsHide: true,
    // Both CLI and runtime must target the test DB, even if .env has DIRECT_URL.
    env: {
      ...process.env,
      DATABASE_URL: url.toString(),
      DIRECT_URL: url.toString(),
    },
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
