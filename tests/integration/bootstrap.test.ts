import { afterAll, describe, expect, it } from "vitest";
import { verifyPassword } from "../../src/lib/password";
import { db } from "../../src/lib/db";
import { createInitialAdmin } from "../../src/lib/services/bootstrap";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

describe("ENG-23 / FR-ADM-01 deployment admin safety", () => {
  afterAll(() => db.$disconnect());
  it("two first deployments create exactly one admin and preserve its password on redeploy", async () => {
    const schema = "bootstrap_" + randomUUID().replaceAll("-", "");
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (
      url.hostname !== "127.0.0.1" ||
      url.pathname !== "/dongho_test" ||
      !/^bootstrap_[a-f0-9]{32}$/.test(schema)
    )
      throw new Error(
        "Bootstrap integration requires its isolated local test schema",
      );
    url.searchParams.set("schema", schema);
    const isolated = new PrismaClient({ datasourceUrl: url.toString() });
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    try {
      await db.$executeRawUnsafe(
        `CREATE TABLE "${schema}"."AdminUser" (LIKE public."AdminUser" INCLUDING ALL)`,
      );
      await db.$executeRawUnsafe(
        `CREATE TABLE "${schema}"."AuditLog" (LIKE public."AuditLog" INCLUDING ALL)`,
      );
      await db.$executeRawUnsafe(
        `ALTER TABLE "${schema}"."AuditLog" ADD FOREIGN KEY ("adminId") REFERENCES "${schema}"."AdminUser"(id)`,
      );
      await expect(
        createInitialAdmin("invalid", "short", isolated),
      ).rejects.toThrow("INITIAL_ADMIN");
      expect(await isolated.adminUser.count()).toBe(0);
      const result = await Promise.all([
        createInitialAdmin(
          "first@example.invalid",
          "first-test-password-over-twenty",
          isolated,
        ),
        createInitialAdmin(
          "second@example.invalid",
          "second-test-password-over-twenty",
          isolated,
        ),
      ]);
      expect(result.filter((row) => row.created)).toHaveLength(1);
      expect(await isolated.adminUser.count()).toBe(1);
      expect(await isolated.auditLog.count()).toBe(1);
      const before = await isolated.adminUser.findFirstOrThrow();
      expect(
        await createInitialAdmin(
          "replacement@example.invalid",
          "replacement-password-over-twenty",
          isolated,
        ),
      ).toEqual({ created: false });
      const after = await isolated.adminUser.findFirstOrThrow();
      expect(after.passwordHash).toBe(before.passwordHash);
      expect(
        await verifyPassword(
          after.passwordHash,
          before.email.startsWith("first")
            ? "first-test-password-over-twenty"
            : "second-test-password-over-twenty",
        ),
      ).toBe(true);
    } finally {
      await isolated.$disconnect();
      // Only this test's newly created UUID schema; never DROP/RESET a database.
      await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    }
  });
  it("redeploy cannot replace an existing admin, create another owner or reset a password", async () => {
    // The isolated test database has no production data. Keep other test accounts.
    const existing = await db.adminUser.findFirst();
    if (!existing) {
      const results = await Promise.all([
        createInitialAdmin(
          "bootstrap-test@example.invalid",
          "test-password-at-least-twenty-characters",
        ),
        createInitialAdmin(
          "competing-test@example.invalid",
          "different-test-password-over-twenty",
        ),
      ]);
      expect(results.filter((r) => r.created)).toHaveLength(1);
    }
    const before = await db.adminUser.findMany({
      orderBy: { id: "asc" },
      select: { id: true, email: true, passwordHash: true },
    });
    expect(before.length).toBeGreaterThan(0);
    expect(
      await createInitialAdmin(
        "replacement@example.invalid",
        "new-password-over-twenty-characters",
      ),
    ).toEqual({ created: false });
    expect(await createInitialAdmin(undefined, undefined)).toEqual({
      created: false,
    });
    const after = await db.adminUser.findMany({
      orderBy: { id: "asc" },
      select: { id: true, email: true, passwordHash: true },
    });
    expect(after).toEqual(before);
    expect(
      await verifyPassword(
        after[0].passwordHash,
        "new-password-over-twenty-characters",
      ),
    ).toBe(false);
  });
});
