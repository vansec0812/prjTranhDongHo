import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules:
      process.env.APP_MODE === "prototype"
        ? { userAgent: "*", disallow: "/" }
        : {
            userAgent: "*",
            allow: "/",
            disallow: [
              "/admin",
              "/api",
              "/dev",
              "/workshop/tra-cuu",
              "/en/workshop/tra-cuu",
            ],
          },
    sitemap: `${process.env.SITE_URL}/sitemap.xml`,
  };
}
