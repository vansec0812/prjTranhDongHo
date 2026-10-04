import { hashPassword } from "../password";
import { z } from "zod";
import { db } from "../db";
import type { PrismaClient } from "@prisma/client";

export async function createInitialAdmin(
  email: string | undefined,
  password: string | undefined,
  database: PrismaClient = db,
) {
  if (await database.adminUser.count()) return { created: false };
  const input = z
    .object({
      email: z.email().max(200),
      password: z.string().min(20).max(200),
    })
    .safeParse({ email, password });
  if (!input.success)
    throw new Error(
      "First deployment requires INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (20+ characters)",
    );
  const passwordHash = await hashPassword(input.data.password);
  return database.$transaction(async (tx) => {
    // Serializes concurrent first deployments. Existing accounts are never reset.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(734021, 1)`;
    if (await tx.adminUser.count()) return { created: false };
    const admin = await tx.adminUser.create({
      data: {
        email: input.data.email.toLowerCase(),
        name: "Quản trị viên",
        passwordHash,
      },
    });
    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: "admin.bootstrap",
        entity: "AdminUser",
        entityId: admin.id,
        diff: { created: true },
      },
    });
    return { created: true };
  });
}
