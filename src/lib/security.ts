import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { DomainError } from "./domain";
import { hash } from "./ids";
import { productionGuard } from "./config";
export function sealPII(value: string) {
  if (!value) return "";
  const key = Buffer.from(process.env.PII_ENCRYPTION_KEY ?? "", "hex");
  if (key.length !== 32) throw new DomainError("CONFIG_UNAVAILABLE", 503);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const content = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), content]
    .map((v) => v.toString("base64url"))
    .join(".");
}
export function openPII(value: string) {
  if (!value) return "";
  const [iv, tag, content] = value
    .split(".")
    .map((v) => Buffer.from(v, "base64url"));
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.PII_ENCRYPTION_KEY ?? "", "hex"),
    iv,
  );
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(content), cipher.final()]).toString(
    "utf8",
  );
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    origin !== new URL(process.env.SITE_URL ?? "http://127.0.0.1:3000").origin
  )
    throw new DomainError("INVALID_ORIGIN", 403);
}
export async function rateLimit(
  scope: string,
  identity: string,
  limit = 5,
  windowMs = 600000,
) {
  const key = hash(`${scope}:${identity}`);
  const now = new Date();
  const reset = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`INSERT INTO "RateLimit" (key,count,"resetAt","createdAt","updatedAt") VALUES (${key},1,${reset},${now},${now}) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "RateLimit"."resetAt"<=${now} THEN 1 ELSE "RateLimit".count+1 END,"resetAt"=CASE WHEN "RateLimit"."resetAt"<=${now} THEN ${reset} ELSE "RateLimit"."resetAt" END,"updatedAt"=${now} RETURNING count`,
  );
  if (rows[0].count > limit) throw new DomainError("RATE_LIMIT", 429);
}
export function requestIdentity(request: Request) {
  // No forwarded IP is trusted unless explicitly enabled by deployment configuration.
  return process.env.TRUST_PROXY === "true"
    ? (request.headers.get("x-real-ip") ?? "unknown")
    : "local";
}
export async function captchaVerify(token: string) {
  productionGuard();
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new DomainError("CAPTCHA_UNAVAILABLE", 503);
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret, response: token }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const data: unknown = await response.json();
    if (
      typeof data !== "object" ||
      data === null ||
      !("success" in data) ||
      data.success !== true
    )
      throw new DomainError("CAPTCHA_INVALID");
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw new DomainError("CAPTCHA_UNAVAILABLE", 503);
  }
}
