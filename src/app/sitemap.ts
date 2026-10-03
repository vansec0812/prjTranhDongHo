import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { paths, localHref } from "@/lib/content";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.APP_MODE === "prototype") return [];
  const url = process.env.SITE_URL ?? "http://127.0.0.1:3000";
  const all = await db.content.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      isDemo: false,
      kind: {
        in: ["PAGE", "PAINTING", "VIDEO", "WORKSHOP", "ARTISAN", "POST"],
      },
    },
  });
  const routes = [
    "/",
    "/lich-su",
    "/thu-vien-tranh",
    "/video",
    "/workshop",
    "/nghe-nhan",
    "/san-pham",
    "/tin-tuc",
    "/hoi-dap",
    "/tham-quan-360",
    "/lien-he",
  ];
  return [...routes, ...all.map((c) => `${paths[c.kind]}/${c.slug}`)].flatMap(
    (path) => [
      {
        url: url + path,
        alternates: {
          languages: {
            vi: url + path,
            en: url + localHref("en", path),
          },
        },
      },
      {
        url: url + localHref("en", path),
        alternates: {
          languages: {
            vi: url + path,
            en: url + localHref("en", path),
          },
        },
      },
    ],
  );
}
