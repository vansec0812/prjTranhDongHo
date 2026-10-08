import { hashPassword } from "../password";
import { z } from "zod";
import { db } from "../db";
import type { PrismaClient } from "@prisma/client";

export async function validateInitialAdmin(
  email: string | undefined,
  password: string | undefined,
  database: PrismaClient = db,
) {
  // Credentials are only needed while the database has no administrator.
  if (await database.adminUser.count()) return null;
  const parsedEmail = z.email().max(200).safeParse(email?.trim().toLowerCase());
  const parsedPassword = z
    .string()
    .min(20)
    .max(200)
    .refine((value) => !/THAY_|CHANGE_ME/.test(value))
    .safeParse(password);
  const errors: string[] = [];
  if (!parsedEmail.success)
    errors.push(
      "INITIAL_ADMIN_EMAIL must be a valid email address (address only)",
    );
  if (!parsedPassword.success)
    errors.push(
      "INITIAL_ADMIN_PASSWORD must contain 20-200 characters and must not be a placeholder",
    );
  if (!parsedEmail.success || !parsedPassword.success)
    throw new Error(
      `Invalid first-admin config: ${errors.join("; ")}. Update these variables in Vercel Production and redeploy. Existing data was not reset.`,
    );
  return { email: parsedEmail.data, password: parsedPassword.data };
}

export async function createInitialAdmin(
  email: string | undefined,
  password: string | undefined,
  database: PrismaClient = db,
) {
  const input = await validateInitialAdmin(email, password, database);
  if (!input) return { created: false };
  const passwordHash = await hashPassword(input.password);
  return database.$transaction(async (tx) => {
    // Serializes concurrent first deployments. Existing accounts are never reset.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(734021, 1)`;
    if (await tx.adminUser.count()) return { created: false };
    const admin = await tx.adminUser.create({
      data: {
        email: input.email,
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
