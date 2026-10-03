import { spawn } from "node:child_process";
const web = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"],
  { stdio: "inherit", windowsHide: true },
);
const worker = spawn(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "scripts/worker.ts"],
  { stdio: "inherit", windowsHide: true },
);
process.on("SIGINT", () => {
  web.kill();
  worker.kill();
  process.exit(0);
});
process.on("SIGTERM", () => {
  web.kill();
  worker.kill();
  process.exit(0);
});
