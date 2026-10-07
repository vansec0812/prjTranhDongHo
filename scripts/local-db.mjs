import "dotenv/config";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== "127.0.0.1" || process.env.APP_MODE !== "prototype")
  throw new Error("Embedded database is only for the local prototype");
const pg = new EmbeddedPostgres({
  databaseDir: ".local/postgres",
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port),
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});
if (!fs.existsSync(".local/postgres/PG_VERSION")) await pg.initialise();
if (process.platform === "win32") {
  const { pg_ctl } = await import("@embedded-postgres/windows-x64");
  // pg_ctl starts PostgreSQL with a restricted token on elevated Windows hosts.
  // Spawning postgres.exe directly is rejected on GitHub's Windows runner.
  const result = spawnSync(
    pg_ctl,
    [
      "start",
      "-D",
      ".local/postgres",
      "-o",
      `-p ${Number(url.port)} -h 127.0.0.1`,
      "-l",
      ".local/postgres-server.log",
      "-w",
      "-t",
      "30",
    ],
    { stdio: "inherit", windowsHide: true },
  );
  if (result.status !== 0) {
    if (fs.existsSync(".local/postgres-server.log"))
      console.error(fs.readFileSync(".local/postgres-server.log", "utf8"));
    throw new Error(`pg_ctl failed to start PostgreSQL: ${result.status}`);
  }
} else await pg.start();
const client = pg.getPgClient("postgres", "127.0.0.1");
await client.connect();
const existing = await client.query(
  "SELECT 1 FROM pg_database WHERE datname=$1",
  ["dongho"],
);
if (!existing.rowCount) await client.query("CREATE DATABASE dongho");
await client.end();
console.log("PostgreSQL 16 local prototype listening on 127.0.0.1:54329");
setInterval(() => {}, 30000);
