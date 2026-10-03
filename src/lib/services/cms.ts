import { z } from "zod";
import { ContentKind } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { db } from "../db";
import { contentInclude } from "../content";
import { DomainError, videoEmbed } from "../domain";
const number = z.coerce.number().int().min(0).max(100000000);
export const contentInput = z.object({
  id: z.string().optional(),
  kind: z.enum(ContentKind),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleVi: z.string().trim().min(2).max(200),
  titleEn: z.string().max(200).default(""),
  summaryVi: z.string().max(2000).default(""),
  summaryEn: z.string().max(2000).default(""),
  bodyVi: z.string().max(100000).default(""),
  bodyEn: z.string().max(100000).default(""),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]),
  scheduledAt: z.string().default(""),
  categoryId: z.string().default(""),
  mediaId: z.string().default(""),
  featured: z.boolean().default(false),
  sortOrder: number.default(0),
  sourceUrl: z.string().max(500).default(""),
  durationSec: number.default(0),
  priceAdult: number.default(150000),
  priceChild: number.default(100000),
  durationMin: number.min(1).default(120),
  minAge: number.max(120).default(6),
  locationVi: z.string().max(300).default(""),
  locationEn: z.string().max(300).default(""),
  includesVi: z.string().max(1000).default(""),
  includesEn: z.string().max(1000).default(""),
  inscription: z.string().max(2000).default(""),
  transliteration: z.string().max(2000).default(""),
  translationVi: z.string().max(2000).default(""),
  translationEn: z.string().max(2000).default(""),
  materialVi: z.string().max(200).default(""),
  materialEn: z.string().max(200).default(""),
  widthCm: number.max(10000).default(0),
  heightCm: number.max(10000).default(0),
  color: z
    .enum(["ink", "vermilion", "ochre", "indigo", "paper"])
    .default("vermilion"),
  size: z.string().max(100).default(""),
  priceRef: number.default(0),
  inStock: z.boolean().default(false),
  eraVi: z.string().max(100).default(""),
  eraEn: z.string().max(100).default(""),
  honorVi: z.string().max(200).default(""),
  honorEn: z.string().max(200).default(""),
  group: z.string().max(100).default(""),
  ctaUrl: z
    .enum(["/workshop", "/lich-su", "/thu-vien-tranh", "/video", "/lien-he"])
    .default("/workshop"),
  ctaLabelVi: z.string().max(100).default("Giữ chỗ workshop"),
  ctaLabelEn: z.string().max(100).default("Book a workshop"),
});
export type ContentInput = z.infer<typeof contentInput>;
function clean(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "h2",
      "h3",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "br",
    ],
    allowedAttributes: { a: ["href", "rel"] },
    allowedSchemes: ["https", "http", "mailto", "tel"],
  });
}
export async function sourceIsActive(url: string) {
  const embed = videoEmbed(url);
  if (!embed) throw new DomainError("VIDEO_SOURCE_INVALID", 422);
  const endpoint =
    embed.type === "YOUTUBE"
      ? `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${embed.id}`)}&format=json`
      : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${embed.id}`)}`;
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if (!response.ok) throw new DomainError("VIDEO_SOURCE_UNAVAILABLE", 422);
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("VIDEO_SOURCE_UNAVAILABLE", 503);
  }
  return embed;
}
export async function saveContent(input: unknown, adminId: string) {
  const data = contentInput.parse(input);
  const existing = data.id
    ? await db.content.findUnique({
        where: { id: data.id },
        include: contentInclude,
      })
    : null;
  if (data.id && !existing) throw new DomainError("CONTENT_NOT_FOUND", 404);
  if (existing && existing.kind !== data.kind)
    throw new DomainError("CONTENT_KIND_LOCKED", 409);
  if (existing?.kind === "PAGE" && existing.slug !== data.slug)
    throw new DomainError("STATIC_ROUTE_LOCKED", 409);
  const media = data.mediaId
    ? await db.media.findUnique({ where: { id: data.mediaId } })
    : null;
  if (data.mediaId && (!media || media.isPrivate))
    throw new DomainError("MEDIA_INVALID", 422);
  if (
    data.categoryId &&
    !(await db.category.findFirst({
      where: { id: data.categoryId, kind: data.kind },
    }))
  )
    throw new DomainError("CATEGORY_INVALID", 422);
  if (
    data.status !== "DRAFT" &&
    media &&
    process.env.APP_MODE === "production" &&
    (media.isDemo || media.scanStatus !== "CLEAN")
  )
    throw new DomainError("MEDIA_NOT_READY", 409);
  if (data.kind === "VIDEO" && data.status !== "DRAFT") {
    if (!media || !data.durationSec)
      throw new DomainError("VIDEO_THUMBNAIL_DURATION_REQUIRED", 422);
    await sourceIsActive(data.sourceUrl);
  }
  if (
    data.kind === "HERO" &&
    data.status !== "DRAFT" &&
    (await db.content.count({
      where: {
        kind: "HERO",
        status: { not: "DRAFT" },
        id: { not: existing?.id },
      },
    })) >= 3
  )
    throw new DomainError("HERO_LIMIT", 422);
  const scheduledAt =
    data.status === "SCHEDULED" ? new Date(data.scheduledAt) : null;
  if (
    scheduledAt &&
    (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date())
  )
    throw new DomainError("SCHEDULE_INVALID", 422);
  return db.$transaction(async (tx) => {
    const common = {
      slug: data.slug,
      titleVi: data.titleVi,
      titleEn: data.titleEn,
      summaryVi: data.summaryVi,
      summaryEn: data.summaryEn,
      bodyVi: clean(data.bodyVi),
      bodyEn: clean(data.bodyEn),
      status: data.status,
      publishedAt:
        data.status === "PUBLISHED"
          ? (existing?.publishedAt ?? new Date())
          : (existing?.publishedAt ?? null),
      scheduledAt,
      mediaId: data.mediaId || null,
      categoryId: data.categoryId || null,
      featured: data.featured,
      sortOrder: data.sortOrder,
    };
    const content = existing
      ? await tx.content.update({ where: { id: existing.id }, data: common })
      : await tx.content.create({
          data: {
            ...common,
            kind: data.kind,
            isDemo: process.env.APP_MODE === "prototype",
          },
        });
    const contentId = content.id;
    switch (data.kind) {
      case "PAGE":
        await tx.page.upsert({
          where: { contentId },
          create: { contentId },
          update: {},
        });
        break;
      case "POST":
        await tx.post.upsert({
          where: { contentId },
          create: { contentId },
          update: {},
        });
        break;
      case "PAINTING": {
        const values = {
          inscription: data.inscription,
          transliteration: data.transliteration,
          translationVi: data.translationVi,
          translationEn: data.translationEn,
          materialVi: data.materialVi,
          materialEn: data.materialEn,
          widthCm: data.widthCm || null,
          heightCm: data.heightCm || null,
          color: data.color,
        };
        await tx.painting.upsert({
          where: { contentId },
          create: { contentId, ...values },
          update: values,
        });
        break;
      }
      case "VIDEO": {
        const embed = videoEmbed(data.sourceUrl);
        const values = {
          sourceUrl: data.sourceUrl,
          sourceType: embed?.type ?? "YOUTUBE",
          durationSec: data.durationSec,
        };
        await tx.video.upsert({
          where: { contentId },
          create: { contentId, ...values, tags: [] },
          update: values,
        });
        break;
      }
      case "WORKSHOP": {
        const values = {
          priceAdult: data.priceAdult,
          priceChild: data.priceChild,
          durationMin: data.durationMin,
          minAge: data.minAge,
          locationVi: data.locationVi,
          locationEn: data.locationEn,
          includesVi: data.includesVi,
          includesEn: data.includesEn,
        };
        await tx.workshop.upsert({
          where: { contentId },
          create: { contentId, ...values },
          update: values,
        });
        break;
      }
      case "MILESTONE": {
        const values = { eraVi: data.eraVi, eraEn: data.eraEn };
        await tx.historyMilestone.upsert({
          where: { contentId },
          create: { contentId, ...values },
          update: values,
        });
        break;
      }
      case "ARTISAN": {
        const values = { honorVi: data.honorVi, honorEn: data.honorEn };
        await tx.artisan.upsert({
          where: { contentId },
          create: { contentId, ...values },
          update: values,
        });
        break;
      }
      case "PRODUCT": {
        const values = {
          size: data.size,
          priceRef: data.priceRef || null,
          inStock: data.inStock,
        };
        await tx.product.upsert({
          where: { contentId },
          create: { contentId, ...values },
          update: values,
        });
        break;
      }
      case "FAQ":
        await tx.faq.upsert({
          where: { contentId },
          create: { contentId, group: data.group },
          update: { group: data.group },
        });
        break;
      case "HERO": {
        const values = {
          ctaUrl: data.ctaUrl,
          ctaLabelVi: data.ctaLabelVi,
          ctaLabelEn: data.ctaLabelEn,
        };
        await tx.heroSlide.upsert({
          where: { contentId },
          create: { contentId, ...values },
          update: values,
        });
        break;
      }
    }
    if (existing && existing.slug !== data.slug && existing.publishedAt) {
      await tx.redirect.updateMany({
        where: { kind: existing.kind, newSlug: existing.slug },
        data: { newSlug: data.slug },
      });
      await tx.redirect.upsert({
        where: {
          kind_oldSlug: { kind: existing.kind, oldSlug: existing.slug },
        },
        create: {
          kind: existing.kind,
          oldSlug: existing.slug,
          newSlug: data.slug,
        },
        update: { newSlug: data.slug },
      });
    }
    await tx.auditLog.create({
      data: {
        adminId,
        action: existing ? "content.update" : "content.create",
        entity: data.kind,
        entityId: contentId,
        diff: {
          fromStatus: existing?.status ?? null,
          toStatus: data.status,
          fromSlug: existing?.slug ?? null,
          toSlug: data.slug,
        },
      },
    });
    return { id: contentId };
  });
}
