import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/password";
import { z } from "zod";
import { db } from "@/lib/db";
import { hash } from "@/lib/ids";
import {
  checkOrigin,
  rateLimit,
  requestIdentity,
  openPII,
} from "@/lib/security";
import { DomainError } from "@/lib/domain";
import { apiError } from "@/lib/api";
import { dispatchCommittedMail } from "@/lib/services/worker";
export const maxDuration = 60;
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request-reset"), email: z.email().max(200) }),
  z.object({
    action: z.enum(["reset", "activate"]),
    token: z.string().min(20).max(200),
    password: z.string().min(12).max(200),
  }),
]);
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit("admin-token", requestIdentity(request));
    const data = schema.parse(await request.json());
    if (data.action === "request-reset") {
      await rateLimit("reset-email", data.email.toLowerCase(), 3);
      const admin = await db.adminUser.findFirst({
        where: { email: data.email.toLowerCase(), isActive: true },
      });
      if (admin) {
        const token = randomBytes(32).toString("base64url");
        await db.$transaction(async (tx) => {
          await tx.token.create({
            data: {
              hash: hash(token),
              purpose: "password-reset",
              subjectId: admin.id,
              expiresAt: new Date(Date.now() + 1800000),
            },
          });
          await tx.outbox.create({
            data: {
              dedupeKey: `reset:${hash(token)}`,
              recipient: admin.email,
              subject: "Khôi phục mật khẩu quản trị",
              body: `${process.env.SITE_URL}/admin/dat-lai-mat-khau?token=${token}`,
            },
          });
        });
      }
      await dispatchCommittedMail();
      return NextResponse.json({ accepted: true });
    }
    await rateLimit("token-identity", hash(data.token), 5);
    const passwordHash = await hashPassword(data.password);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Token" WHERE hash=${hash(data.token)} FOR UPDATE`;
      const token = await tx.token.findUnique({
        where: { hash: hash(data.token) },
      });
      if (
        !token ||
        token.usedAt ||
        token.expiresAt <= new Date() ||
        token.purpose !==
          (data.action === "reset" ? "password-reset" : "admin-invite")
      )
        throw new DomainError("TOKEN_INVALID", 409);
      if (data.action === "reset") {
        await tx.adminUser.update({
          where: { id: token.subjectId },
          data: {
            passwordHash,
            authVersion: { increment: 1 },
            failedAttempts: 0,
            lockedUntil: null,
          },
        });
        await tx.adminSession.updateMany({
          where: { adminId: token.subjectId },
          data: { revokedAt: new Date() },
        });
      } else {
        const info = z
          .object({ email: z.email(), name: z.string() })
          .parse(JSON.parse(openPII(token.subjectId)));
        const user = await tx.adminUser.create({
          data: { email: info.email, name: info.name, passwordHash },
        });
        await tx.auditLog.create({
          data: {
            adminId: user.id,
            action: "admin.invitation.accept",
            entity: "AdminUser",
            entityId: user.id,
            diff: { activated: true },
          },
        });
      }
      await tx.token.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
    });
    return NextResponse.json(
      { saved: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
