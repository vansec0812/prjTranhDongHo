import { z } from "zod";
import { runtimeDatabaseUrl } from "./database-config";
import { cloudPrototype } from "./deployment";
export const settingsSchema = z.object({
  studioVi: z.string().max(100).default("Xưởng tranh dân gian"),
  studioEn: z.string().max(100).default("Folk painting studio"),
  addressVi: z.string().max(300).default("Làng Đông Hồ, Bắc Ninh"),
  addressEn: z.string().max(300).default("Dong Ho village, Bac Ninh"),
  hoursVi: z.string().max(100).default("Giờ mở cửa chưa được cơ sở xác nhận"),
  hoursEn: z
    .string()
    .max(100)
    .default("Opening hours await studio confirmation"),
  phone: z.string().max(40).default(""),
  email: z.string().max(200).default(""),
  zalo: z.string().url().or(z.literal("")).default(""),
  messenger: z.string().url().or(z.literal("")).default(""),
  facebook: z.string().url().or(z.literal("")).default(""),
  bankVi: z
    .string()
    .max(1000)
    .default("Lịch học minh họa; không chuyển tiền cho bản demo."),
  bankEn: z
    .string()
    .max(1000)
    .default("Sample classes; do not make a payment for this demo."),
  cancelHours: z.number().int().min(0).max(720).default(24),
  almostFullPercent: z.number().int().min(1).max(50).default(20),
  stats: z
    .array(
      z.object({
        value: z.string().max(20),
        labelVi: z.string().max(80),
        labelEn: z.string().max(80),
      }),
    )
    .max(4)
    .default([]),
  quoteVi: z.string().max(500).default(""),
  quoteEn: z.string().max(500).default(""),
  quoteArtisan: z.string().max(100).default(""),
  heroPaintingIds: z
    .array(z.string())
    .max(3)
    .refine(
      (ids) =>
        ids.length === 0 || (ids.length === 3 && new Set(ids).size === 3),
      "Chọn ba tranh khác nhau hoặc để trống tất cả",
    )
    .default([]),
  mapQuery: z.string().max(200).default("Làng tranh Đông Hồ, Bắc Ninh"),
});
export type SiteSettings = z.infer<typeof settingsSchema>;
export function productionGuard() {
  if (
    process.env.VERCEL === "1" &&
    process.env.APP_MODE !== "production" &&
    !cloudPrototype()
  )
    throw new Error(
      "Vercel requires APP_MODE=production and durable production integrations",
    );
  if (process.env.APP_MODE === "production" || cloudPrototype()) {
    runtimeDatabaseUrl();
    for (const key of [
      "AUTH_SECRET",
      ...(process.env.VERCEL === "1" ? ["CRON_SECRET"] : []),
      "PII_ENCRYPTION_KEY",
      "TURNSTILE_SECRET_KEY",
      "MAIL_FROM",
      "ADMIN_NOTIFY_EMAIL",
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
      ...(process.env.APP_MODE === "production" ? ["SCANNER_COMMAND"] : []),
      ...(process.env.MEDIA_STORAGE === "vercel-blob"
        ? []
        : [
            "R2_ENDPOINT",
            "R2_BUCKET",
            "R2_ACCESS_KEY_ID",
            "R2_SECRET_ACCESS_KEY",
          ]),
      ...(process.env.MAIL_MODE === "resend"
        ? ["RESEND_API_KEY"]
        : ["SMTP_HOST"]),
    ])
      if (!process.env[key] || /THAY_|CHANGE_ME/.test(process.env[key] ?? ""))
        throw new Error(`Missing required production config: ${key}`);
    if (
      process.env.MEDIA_STORAGE === "vercel-blob" &&
      !process.env.BLOB_READ_WRITE_TOKEN &&
      !(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
    )
      throw new Error("Missing private Vercel Blob connection");
    if (
      (process.env.AUTH_SECRET?.length ?? 0) < 32 ||
      !/^[a-f0-9]{64}$/i.test(process.env.PII_ENCRYPTION_KEY ?? "")
    )
      throw new Error("Invalid AUTH_SECRET or PII_ENCRYPTION_KEY format");
    if (
      process.env.VERCEL === "1" &&
      (process.env.CRON_SECRET?.length ?? 0) < 32
    )
      throw new Error("CRON_SECRET must have at least 32 characters");
    if (
      cloudPrototype() &&
      (process.env.MEDIA_STORAGE !== "vercel-blob" ||
        process.env.MAIL_MODE !== "resend")
    )
      throw new Error(
        "Cloud prototype requires private Blob and real Resend email",
      );
    if (
      process.env.MAIL_MODE === "local" ||
      /^[123]x000/.test(process.env.TURNSTILE_SECRET_KEY ?? "") ||
      /^[123]x000/.test(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "")
    )
      throw new Error("Demo adapters are forbidden in production");
    if (!process.env.SITE_URL?.startsWith("https://"))
      throw new Error("Production requires HTTPS");
  }
}
