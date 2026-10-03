import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
export class DomainError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function normalizePhone(value: string) {
  const p = parsePhoneNumberFromString(value, "VN");
  if (!p?.isValid()) throw new DomainError("INVALID_PHONE");
  return p.number;
}
export function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
export function slugify(value: string) {
  return fold(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export const phoneSchema = z
  .string()
  .max(40)
  .transform((v, ctx) => {
    try {
      return normalizePhone(v);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Số điện thoại không hợp lệ / Invalid phone number",
      });
      return z.NEVER;
    }
  });
export const registrationSchema = z
  .object({
    sessionId: z.string().min(1),
    fullName: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    email: z.email().max(200),
    adults: z.number().int().min(0).max(1000),
    children: z.number().int().min(0).max(1000),
    language: z.enum(["vi", "en"]),
    note: z.string().max(1000).default(""),
    consent: z.literal(true),
    idempotencyKey: z.uuid(),
    captcha: z.string().min(1),
    website: z.literal("").default(""),
  })
  .refine((v) => v.adults + v.children >= 1, {
    path: ["adults"],
    message: "Cần ít nhất một người / At least one participant",
  });
export const contactSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  email: z.email().max(200),
  message: z.string().trim().min(20).max(2000),
  topic: z.enum(["faq", "painting", "education", "group", "press", "other"]),
  artisanId: z.string().optional(),
  paintingId: z.string().optional(),
  language: z.enum(["vi", "en"]),
  consent: z.literal(true),
  captcha: z.string().min(1),
  website: z.literal("").default(""),
});
export function totalPrice(
  adults: number,
  children: number,
  priceAdult: number,
  priceChild: number,
) {
  return adults * priceAdult + children * priceChild;
}
export function canCancel(startsAt: Date, now: Date, hours: number) {
  return startsAt.getTime() - now.getTime() >= hours * 3600000;
}
export function money(value: number, locale = "vi") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
export function dateLabel(value: Date | string, locale = "vi") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}
export function videoEmbed(value: string) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;
    if (["youtube.com", "www.youtube.com", "youtu.be"].includes(u.hostname)) {
      const id =
        u.hostname === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v");
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id))
        return {
          type: "YOUTUBE" as const,
          url: `https://www.youtube-nocookie.com/embed/${id}`,
          id,
        };
    }
    if (
      ["vimeo.com", "www.vimeo.com"].includes(u.hostname) &&
      /^\/\d+$/.test(u.pathname)
    )
      return {
        type: "VIMEO" as const,
        url: `https://player.vimeo.com/video${u.pathname}`,
        id: u.pathname.slice(1),
      };
    return null;
  } catch {
    return null;
  }
}
export const allowedTransitions = {
  WAITLIST: ["CANCELLED"],
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ATTENDED", "NO_SHOW", "CANCELLED"],
  ATTENDED: [],
  NO_SHOW: [],
  CANCELLED: [],
} satisfies Record<string, string[]>;
