import { createHash } from "node:crypto";
import type { Content, HistoryMilestone, PrismaClient } from "@prisma/client";
import { z } from "zod";
import rawContent from "../../data/cultural-content-v2.json";
import { db } from "../db";

const entrySchema = z
  .object({
    kind: z.enum(["PAGE", "MILESTONE", "FAQ"]),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    titleVi: z.string().min(1),
    titleEn: z.string().min(1),
    summaryVi: z.string(),
    summaryEn: z.string(),
    bodyVi: z.string(),
    bodyEn: z.string(),
    sortOrder: z.number().int().nonnegative(),
    expectedHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    sourceIds: z.array(z.string()).min(1),
    eraVi: z.string().optional(),
    eraEn: z.string().optional(),
  })
  .refine(
    (entry) =>
      entry.kind !== "MILESTONE" || Boolean(entry.eraVi && entry.eraEn),
  );
export const culturalContent = z
  .object({
    version: z.string().regex(/^[a-z0-9-]+$/),
    sources: z.array(
      z.object({
        id: z.string(),
        labelVi: z.string(),
        labelEn: z.string(),
        url: z.url().startsWith("https://"),
        checkedAt: z.string(),
      }),
    ),
    entries: z.array(entrySchema).max(30),
  })
  .parse(rawContent);

type EditorialFields = {
  titleVi: string;
  titleEn: string;
  summaryVi: string;
  summaryEn: string;
  bodyVi: string;
  bodyEn: string;
  sortOrder: number;
  milestone?: {
    eraVi: string;
    eraEn: string;
    yearFrom?: number | null;
    yearTo?: number | null;
  } | null;
};
export function editorialFingerprint(content: EditorialFields) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        content.titleVi,
        content.titleEn,
        content.summaryVi,
        content.summaryEn,
        content.bodyVi,
        content.bodyEn,
        content.sortOrder,
        content.milestone?.eraVi ?? null,
        content.milestone?.eraEn ?? null,
        content.milestone?.yearFrom ?? null,
        content.milestone?.yearTo ?? null,
      ]),
    )
    .digest("hex");
}

export async function enrichCulturalContent(
  database: PrismaClient = db,
  revision = culturalContent,
) {
  return database.$transaction(
    async (tx) => {
      // One content revision, including its backup and marker, commits atomically.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(734021, 3)`;
      const marker = revision.version;
      if (await tx.siteSetting.findUnique({ where: { key: marker } }))
        return { applied: false, created: 0, updated: 0, preserved: 0 };
      const before: Array<Content & { milestone: HistoryMilestone | null }> =
        [];
      const createdIds: string[] = [];
      let created = 0,
        updated = 0,
        preserved = 0;
      for (const entry of revision.entries) {
        // CMS writes lock Content first, so refresh the record after acquiring its
        // lock. Only unchanged importer text is replaced; custom edits stay intact.
        await tx.$queryRaw`SELECT id FROM "Content" WHERE kind::text=${entry.kind} AND slug=${entry.slug} FOR UPDATE`;
        const existing = await tx.content.findUnique({
          where: { kind_slug: { kind: entry.kind, slug: entry.slug } },
          include: { milestone: true },
        });
        if (
          existing &&
          (!entry.expectedHash ||
            editorialFingerprint(existing) !== entry.expectedHash)
        ) {
          preserved++;
          continue;
        }
        if (existing) before.push(existing);
        const data = {
          titleVi: entry.titleVi,
          titleEn: entry.titleEn,
          summaryVi: entry.summaryVi,
          summaryEn: entry.summaryEn,
          bodyVi: entry.bodyVi,
          bodyEn: entry.bodyEn,
          sortOrder: entry.sortOrder,
        };
        const content = existing
          ? await tx.content.update({ where: { id: existing.id }, data })
          : await tx.content.create({
              data: {
                ...data,
                kind: entry.kind,
                slug: entry.slug,
                status: "PUBLISHED",
                isDemo: false,
                publishedAt: new Date(),
              },
            });
        if (entry.kind === "MILESTONE") {
          const eras = { eraVi: entry.eraVi ?? "", eraEn: entry.eraEn ?? "" };
          await tx.historyMilestone.upsert({
            where: { contentId: content.id },
            create: { contentId: content.id, ...eras },
            update: eras,
          });
        } else if (entry.kind === "PAGE")
          await tx.page.upsert({
            where: { contentId: content.id },
            create: { contentId: content.id },
            update: {},
          });
        else
          await tx.faq.upsert({
            where: { contentId: content.id },
            create: {
              contentId: content.id,
              group: "Tranh và làng nghề / Prints and craft",
            },
            update: {},
          });
        if (existing) updated++;
        else {
          created++;
          createdIds.push(content.id);
        }
      }
      await tx.siteSetting.upsert({
        where: { key: `content-backup:${marker}` },
        update: {},
        create: {
          key: `content-backup:${marker}`,
          value: {
            format: "json",
            payload: JSON.stringify(before),
            createdIds,
            savedAt: new Date().toISOString(),
          },
        },
      });
      await tx.siteSetting.create({
        data: {
          key: marker,
          value: {
            created,
            updated,
            preserved,
            appliedAt: new Date().toISOString(),
            trigger: "authorized-coursework-content-update",
            sourceCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
            sourceIds: revision.sources.map((source) => source.id),
            createdIds,
          },
        },
      });
      return { applied: true, created, updated, preserved };
    },
    { timeout: 30000 },
  );
}
