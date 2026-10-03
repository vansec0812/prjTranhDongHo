import "dotenv/config";
import fs from "node:fs";
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
await pg.start();
const client = pg.getPgClient("postgres");
await client.connect();
const existing = await client.query(
  "SELECT 1 FROM pg_database WHERE datname=$1",
  ["dongho"],
);
await client.end();
if (!existing.rowCount) await pg.createDatabase("dongho");
console.log("PostgreSQL 16 local prototype listening on 127.0.0.1:54329");
setInterval(() => {}, 30000);
