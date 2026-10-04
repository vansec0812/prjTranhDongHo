import "dotenv/config";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { db } from "../src/lib/db";
import { cloudPrototype } from "../src/lib/deployment";
import { productionGuard } from "../src/lib/config";
import { migrationDatabaseUrl } from "../src/lib/database-config";
import { createInitialAdmin } from "../src/lib/services/bootstrap";
import { seedDemo } from "../prisma/seed";
import { importSourceContent } from "./import-source-content";

async function main() {
  productionGuard();
  if (process.env.BOOTSTRAP_DEMO !== "true") {
    console.log(
      "Database bootstrap disabled; existing schema and content preserved.",
    );
    return;
  }
  if (!cloudPrototype() || process.env.VERCEL_ENV !== "production")
    throw new Error(
      "BOOTSTRAP_DEMO only supports the explicitly selected Vercel prototype on its Production environment; never Preview or real production",
    );
  const url = new URL(migrationDatabaseUrl());
  url.searchParams.set("connection_limit", "1");
  const lock = new PrismaClient({ datasourceUrl: url.toString() });
  let acquired = false;
  try {
    const rows = await lock.$queryRaw<
      Array<{ acquired: boolean }>
    >`SELECT pg_try_advisory_lock(734021, 2) AS acquired`;
    acquired = rows[0]?.acquired === true;
    if (!acquired)
      throw new Error(
        "Another database bootstrap is running; retry deployment after it completes",
      );
    const migration = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { encoding: "utf8", windowsHide: true, env: process.env },
    );
    // Provider errors may contain connection strings. Do not relay raw output.
    if (migration.status !== 0)
      throw new Error(
        "Migration failed. Check direct DB access, TLS and migration state; no reset was performed",
      );
    console.log("Committed migrations applied without reset.");
    const marker = "vercel-demo-bootstrap-v1";
    if (!(await db.siteSetting.findUnique({ where: { key: marker } }))) {
      await seedDemo();
      await importSourceContent();
    }
    await createInitialAdmin(
      process.env.INITIAL_ADMIN_EMAIL,
      process.env.INITIAL_ADMIN_PASSWORD,
    );
    await db.siteSetting.upsert({
      where: { key: marker },
      create: { key: marker, value: { completedAt: new Date().toISOString() } },
      update: {},
    });
    console.log(
      "Prototype database ready. Existing accounts, passwords and CMS edits preserved.",
    );
  } finally {
    try {
      if (acquired) await lock.$queryRaw`SELECT pg_advisory_unlock(734021, 2)`;
    } finally {
      await lock.$disconnect();
    }
  }
}
main()
  .catch((error) => {
    // Only controlled configuration errors are shown; Prisma diagnostics stay private.
    console.error(
      error instanceof Error && error.constructor === Error
        ? error.message
        : "Database preparation failed; check database connectivity and permissions",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
