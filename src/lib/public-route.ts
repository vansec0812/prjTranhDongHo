import { notFound, permanentRedirect } from "next/navigation";
import type { ContentKind } from "@prisma/client";
import { db } from "./db";
import { findContent, localHref, type Locale } from "./content";
const kinds: Record<string, ContentKind | undefined> = {
  "thu-vien-tranh": "PAINTING",
  video: "VIDEO",
  workshop: "WORKSHOP",
  "nghe-nhan": "ARTISAN",
  "tin-tuc": "POST",
  "san-pham": "PRODUCT",
};
const staticPages = [
  "gioi-thieu",
  "tham-quan",
  "chinh-sach-bao-mat",
  "dieu-khoan",
];
const staticRoutes = [
  "lich-su",
  "hoi-dap",
  "lien-he",
  "tim-kiem",
  "san-pham",
  "ban-tin",
  "tham-quan-360",
  "virtual-tour",
];
// Validate before the root layout streams headers, so unavailable/draft URLs return
// HTTP 404 instead of a streamed 200 containing a not-found screen.
export async function validatePublicRoute(pathname: string, locale: Locale) {
  const parts = pathname
    .replace(/^\/(en|vi)(?=\/|$)/, "")
    .split("/")
    .filter(Boolean);
  if (!parts.length) return;
  if (parts.length > 2) notFound();
  const [section, slug] = parts;
  if (section === "workshop" && slug === "tra-cuu") return;
  if (!slug && staticRoutes.includes(section)) return;
  if (!slug && staticPages.includes(section)) {
    if (!(await findContent("PAGE", section))) notFound();
    return;
  }
  const kind = kinds[section];
  if (!kind) notFound();
  if (!slug) return;
  if (await findContent(kind, slug)) return;
  const redirect = await db.redirect.findUnique({
    where: { kind_oldSlug: { kind, oldSlug: slug } },
  });
  if (redirect && (await findContent(kind, redirect.newSlug)))
    permanentRedirect(localHref(locale, `/${section}/${redirect.newSlug}`));
  notFound();
}
