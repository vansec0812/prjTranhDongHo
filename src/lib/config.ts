import { z } from "zod";
import { runtimeDatabaseUrl } from "./database-config";
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
  if (process.env.VERCEL === "1" && process.env.APP_MODE !== "production")
    throw new Error(
      "Vercel requires APP_MODE=production and durable production integrations",
    );
  if (process.env.APP_MODE === "production") {
    runtimeDatabaseUrl();
    for (const key of [
      "AUTH_SECRET",
      "PII_ENCRYPTION_KEY",
      "TURNSTILE_SECRET_KEY",
      "R2_ENDPOINT",
      "R2_BUCKET",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "SMTP_HOST",
      "MAIL_FROM",
      "ADMIN_NOTIFY_EMAIL",
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
      "SCANNER_COMMAND",
    ])
      if (!process.env[key])
        throw new Error(`Missing required production config: ${key}`);
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
