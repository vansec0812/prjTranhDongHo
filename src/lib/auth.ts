import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import argon2 from "argon2";
import { authenticator } from "otplib";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { openPII, rateLimit, requestIdentity } from "./security";
import { DomainError } from "./domain";
const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
  totp: z.string().max(10).optional(),
});
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, totp: {} },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password, totp } = parsed.data;
        try {
          await rateLimit("login-ip", requestIdentity(request), 20);
          await rateLimit("login-email", email.toLowerCase(), 10);
        } catch {
          return null;
        }
        // Serialize failures per account so simultaneous attempts cannot bypass the five-attempt lock.
        return db.$transaction(
          async (tx) => {
            const users = await tx.$queryRaw<
              Array<{ id: string }>
            >`SELECT id FROM "AdminUser" WHERE email=${email.toLowerCase()} FOR UPDATE`;
            const user = users[0]
              ? await tx.adminUser.findUnique({ where: { id: users[0].id } })
              : null;
            if (
              !user?.isActive ||
              (user.lockedUntil && user.lockedUntil > new Date())
            )
              return null;
            const verified =
              (await argon2.verify(user.passwordHash, password)) &&
              (!user.totpSecret ||
                Boolean(
                  totp && authenticator.check(totp, openPII(user.totpSecret)),
                ));
            if (!verified) {
              const attempts = user.failedAttempts + 1;
              await tx.adminUser.update({
                where: { id: user.id },
                data: {
                  failedAttempts: attempts,
                  lockedUntil:
                    attempts >= 5 ? new Date(Date.now() + 900000) : null,
                },
              });
              return null;
            }
            await tx.adminUser.update({
              where: { id: user.id },
              data: {
                failedAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
              },
            });
            const sid = randomUUID();
            await tx.adminSession.create({
              data: { id: sid, adminId: user.id, version: user.authVersion },
            });
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              sid,
              version: user.authVersion,
            };
          },
          { timeout: 10000 },
        );
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.adminId = user.id;
        token.sid = "sid" in user ? user.sid : undefined;
        token.version = "version" in user ? user.version : undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.adminId === "string" && typeof token.sid === "string") {
        session.user.id = token.adminId;
        session.sid = token.sid;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && typeof message.token?.sid === "string")
        await db.adminSession.updateMany({
          where: { id: message.token.sid },
          data: { revokedAt: new Date() },
        });
    },
  },
});
export async function requireAdmin() {
  const session = await auth();
  if (!session?.sid) throw new DomainError("UNAUTHORIZED", 401);
  const row = await db.adminSession.findUnique({
    where: { id: session.sid },
    include: { admin: true },
  });
  if (
    !row ||
    row.revokedAt ||
    !row.admin.isActive ||
    row.version !== row.admin.authVersion ||
    Date.now() - row.lastSeenAt.getTime() >= 8 * 3600000
  )
    throw new DomainError("SESSION_EXPIRED", 401);
  await db.adminSession.update({
    where: { id: row.id },
    data: { lastSeenAt: new Date() },
  });
  return row.admin;
}
