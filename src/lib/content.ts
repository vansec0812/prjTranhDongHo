import { Prisma, ContentKind } from "@prisma/client";
import { db } from "./db";
import { settingsSchema } from "./config";
export const contentInclude = {
  category: true,
  media: true,
  painting: true,
  video: true,
  workshop: true,
  artisan: true,
  product: true,
  milestone: true,
  faq: true,
  hero: true,
} satisfies Prisma.ContentInclude;
export type ContentRecord = Prisma.ContentGetPayload<{
  include: typeof contentInclude;
}>;
export type Locale = "vi" | "en";
export function isLocale(value: string): value is Locale {
  return value === "vi" || value === "en";
}
export const publicFilter: Prisma.ContentWhereInput = {
  status: "PUBLISHED",
  publishedAt: { lte: new Date() },
};
export async function contents(kind: ContentKind) {
  return db.content.findMany({
    where: {
      kind,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      ...(process.env.APP_MODE === "production" ? { isDemo: false } : {}),
    },
    include: contentInclude,
    orderBy: [
      { featured: "desc" },
      { sortOrder: "asc" },
      { publishedAt: "desc" },
      { id: "asc" },
    ],
  });
}
export async function findContent(kind: ContentKind, slug: string) {
  return db.content.findFirst({
    where: {
      kind,
      slug,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      ...(process.env.APP_MODE === "production" ? { isDemo: false } : {}),
    },
    include: contentInclude,
  });
}
export async function getSettings() {
  const row = await db.siteSetting.findUnique({ where: { key: "site" } });
  return settingsSchema.parse(row?.value ?? {});
}
export function text(
  item: { titleVi: string; titleEn: string },
  locale: Locale,
) {
  return locale === "en" && item.titleEn ? item.titleEn : item.titleVi;
}
export function summary(item: ContentRecord, locale: Locale) {
  return locale === "en" && item.summaryEn ? item.summaryEn : item.summaryVi;
}
export function body(item: ContentRecord, locale: Locale) {
  return locale === "en" && item.bodyEn ? item.bodyEn : item.bodyVi;
}
export { localHref } from "./links";
import { localHref } from "./links";
export const paths: Record<ContentKind, string> = {
  PAGE: "",
  MILESTONE: "/lich-su",
  PAINTING: "/thu-vien-tranh",
  VIDEO: "/video",
  WORKSHOP: "/workshop",
  ARTISAN: "/nghe-nhan",
  POST: "/tin-tuc",
  PRODUCT: "/san-pham",
  FAQ: "/hoi-dap",
  HERO: "/",
};
export function contentHref(item: ContentRecord, locale: Locale) {
  return localHref(
    locale,
    paths[item.kind] +
      (item.kind === "PAGE"
        ? "/" + item.slug
        : ["MILESTONE", "FAQ", "HERO"].includes(item.kind)
          ? ""
          : "/" + item.slug),
  );
}
