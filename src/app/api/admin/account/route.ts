import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/password";
import { authenticator } from "otplib";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, sealPII, openPII } from "@/lib/security";
import { hash } from "@/lib/ids";
import { DomainError } from "@/lib/domain";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { dispatchCommittedMail } from "@/lib/services/worker";
export const maxDuration = 60;
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    email: z.email().max(200),
    name: z.string().min(2).max(80),
  }),
  z.object({
    action: z.literal("toggle"),
    id: z.string(),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal("password"),
    currentPassword: z.string(),
    password: z.string().min(12).max(200),
  }),
  z.object({ action: z.literal("totp.setup"), password: z.string() }),
  z.object({
    action: z.literal("totp.enable"),
    token: z.string(),
    code: z.string().regex(/^\d{6}$/),
  }),
  z.object({
    action: z.literal("totp.disable"),
    password: z.string(),
    code: z.string().regex(/^\d{6}$/),
  }),
]);
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    checkOrigin(request);
    const data = schema.parse(await request.json());
    if (data.action === "invite") {
      if (
        await db.adminUser.count({ where: { email: data.email.toLowerCase() } })
      )
        throw new DomainError("ADMIN_EXISTS", 409);
      const token = randomBytes(32).toString("base64url");
      await db.$transaction(async (tx) => {
        await tx.token.create({
          data: {
            hash: hash(token),
            purpose: "admin-invite",
            subjectId: sealPII(
              JSON.stringify({
                email: data.email.toLowerCase(),
                name: data.name,
              }),
            ),
            expiresAt: new Date(Date.now() + 86400000),
          },
        });
        await tx.outbox.create({
          data: {
            dedupeKey: `admin-invite:${hash(token)}`,
            recipient: data.email,
            subject: "Lời mời quản trị xưởng tranh Đông Hồ",
            body: `${process.env.SITE_URL}/admin/kich-hoat?token=${token}`,
          },
        });
        await tx.auditLog.create({
          data: {
            adminId: admin.id,
            action: "admin.invite",
            entity: "AdminUser",
            entityId: "invitation",
            diff: { invited: true },
          },
        });
      });
      await dispatchCommittedMail();
      return NextResponse.json({
        message: "Lời mời đã được tạo và đưa vào hàng đợi email.",
      });
    }
    if (data.action === "toggle") {
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(5432901)`;
        const target = await tx.adminUser.findUniqueOrThrow({
          where: { id: data.id },
        });
        if (
          !data.active &&
          target.isActive &&
          (await tx.adminUser.count({ where: { isActive: true } })) <= 1
        )
          throw new DomainError("LAST_ADMIN_LOCKED", 409);
        await tx.adminUser.update({
          where: { id: data.id },
          data: { isActive: data.active, authVersion: { increment: 1 } },
        });
        await tx.adminSession.updateMany({
          where: { adminId: data.id },
          data: { revokedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            adminId: admin.id,
            action: "admin.active",
            entity: "AdminUser",
            entityId: data.id,
            diff: { active: data.active },
          },
        });
      });
      return NextResponse.json({ saved: true });
    }
    if (data.action === "password") {
      if (!(await verifyPassword(admin.passwordHash, data.currentPassword)))
        throw new DomainError("PASSWORD_INVALID", 403);
      const passwordHash = await hashPassword(data.password);
      await db.$transaction(async (tx) => {
        await tx.adminUser.update({
          where: { id: admin.id },
          data: { passwordHash, authVersion: { increment: 1 } },
        });
        await tx.adminSession.updateMany({
          where: { adminId: admin.id },
          data: { revokedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            adminId: admin.id,
            action: "admin.password",
            entity: "AdminUser",
            entityId: admin.id,
            diff: { sessionsRevoked: true },
          },
        });
      });
      return NextResponse.json({
        message: "Đã đổi mật khẩu. Đăng nhập lại bằng mật khẩu mới.",
      });
    }
    if (data.action === "totp.setup") {
      if (!(await verifyPassword(admin.passwordHash, data.password)))
        throw new DomainError("PASSWORD_INVALID", 403);
      const secret = authenticator.generateSecret();
      const token = randomBytes(32).toString("base64url");
      await db.token.create({
        data: {
          hash: hash(token),
          purpose: "totp-setup",
          subjectId: admin.id + ":" + sealPII(secret),
          expiresAt: new Date(Date.now() + 600000),
        },
      });
      return NextResponse.json(
        {
          token,
          secret,
          uri: authenticator.keyuri(admin.email, "Tranh Đông Hồ", secret),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (data.action === "totp.enable") {
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Token" WHERE hash=${hash(data.token)} FOR UPDATE`;
        const token = await tx.token.findUnique({
          where: { hash: hash(data.token) },
        });
        if (
          !token ||
          token.usedAt ||
          token.expiresAt <= new Date() ||
          token.purpose !== "totp-setup" ||
          !token.subjectId.startsWith(admin.id + ":")
        )
          throw new DomainError("TOKEN_INVALID", 409);
        const encrypted = token.subjectId.slice(admin.id.length + 1);
        if (!authenticator.check(data.code, openPII(encrypted)))
          throw new DomainError("TOTP_INVALID", 422);
        await tx.token.update({
          where: { id: token.id },
          data: { usedAt: new Date() },
        });
        await tx.adminUser.update({
          where: { id: admin.id },
          data: { totpSecret: encrypted, authVersion: { increment: 1 } },
        });
        await tx.auditLog.create({
          data: {
            adminId: admin.id,
            action: "admin.totp.enable",
            entity: "AdminUser",
            entityId: admin.id,
            diff: { enabled: true },
          },
        });
      });
      return NextResponse.json({
        message: "Đã bật 2FA. Đăng nhập lại với mã TOTP.",
      });
    }
    if (
      !admin.totpSecret ||
      !(await verifyPassword(admin.passwordHash, data.password)) ||
      !authenticator.check(data.code, openPII(admin.totpSecret))
    )
      throw new DomainError("TOTP_INVALID", 403);
    await db.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: { id: admin.id },
        data: { totpSecret: null, authVersion: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "admin.totp.disable",
          entity: "AdminUser",
          entityId: admin.id,
          diff: { enabled: false },
        },
      });
    });
    return NextResponse.json({ message: "Đã tắt 2FA. Đăng nhập lại." });
  } catch (error) {
    return apiError(error);
  }
}
