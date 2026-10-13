import { randomUUID } from "node:crypto";
import { ContentKind, ContentStatus, PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../../src/lib/db";
import {
  culturalContent,
  editorialFingerprint,
  enrichCulturalContent,
} from "../../src/lib/services/cultural-content";

describe("ENG-23 sourced editorial content updates", () => {
  afterAll(() => db.$disconnect());
  async function isolated(
    run: (database: PrismaClient, schema: string) => Promise<void>,
  ) {
    const schema = "editorial_" + randomUUID().replaceAll("-", "");
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (
      url.hostname !== "127.0.0.1" ||
      url.pathname !== "/dongho_test" ||
      !/^editorial_[a-f0-9]{32}$/.test(schema)
    )
      throw new Error(
        "Editorial tests require their own schema in the local test database",
      );
    url.searchParams.set("schema", schema);
    const database = new PrismaClient({ datasourceUrl: url.toString() });
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    try {
      // Prisma qualifies enum casts with the connection schema. Copy the exact
      // generated enum values and use them in this test's empty cloned table.
      for (const [name, values] of [
        ["ContentKind", Object.values(ContentKind)],
        ["ContentStatus", Object.values(ContentStatus)],
      ] as const)
        await db.$executeRawUnsafe(
          `CREATE TYPE "${schema}"."${name}" AS ENUM (${values.map((value) => `'${value}'`).join(",")})`,
        );
      for (const table of [
        "Content",
        "HistoryMilestone",
        "Page",
        "Faq",
        "SiteSetting",
      ])
        await db.$executeRawUnsafe(
          `CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`,
        );
      for (const table of ["HistoryMilestone", "Page", "Faq"])
        await db.$executeRawUnsafe(
          `ALTER TABLE "${schema}"."${table}" ADD FOREIGN KEY ("contentId") REFERENCES "${schema}"."Content"(id)`,
        );
      await db.$executeRawUnsafe(
        `ALTER TABLE "${schema}"."Content" ALTER COLUMN status DROP DEFAULT`,
      );
      for (const [column, type] of [
        ["kind", "ContentKind"],
        ["status", "ContentStatus"],
      ])
        await db.$executeRawUnsafe(
          `ALTER TABLE "${schema}"."Content" ALTER COLUMN "${column}" TYPE "${schema}"."${type}" USING "${column}"::text::"${schema}"."${type}"`,
        );
      await db.$executeRawUnsafe(
        `ALTER TABLE "${schema}"."Content" ALTER COLUMN status SET DEFAULT 'DRAFT'::"${schema}"."ContentStatus"`,
      );
      await run(database, schema);
    } finally {
      await database.$disconnect();
      // Only the UUID schema created above; never the user's database or schemas.
      await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    }
  }
  it("commits one concurrent revision, preserves CMS edits/publication/media and retains an immutable backup", async () => {
    await isolated(async (database) => {
      const old = await database.content.create({
        data: {
          kind: "MILESTONE",
          slug: "original",
          titleVi: "Old title",
          titleEn: "Old title",
          summaryVi: "Old summary",
          summaryEn: "Old summary",
          bodyVi: "<p>Old body</p>",
          bodyEn: "<p>Old body</p>",
          status: "DRAFT",
          mediaId: "preserved-media-id",
          publishedAt: new Date("2026-01-01T00:00:00Z"),
          milestone: { create: { eraVi: "2013", eraEn: "2013" } },
        },
        include: { milestone: true },
      });
      const custom = await database.content.create({
        data: {
          kind: "PAGE",
          slug: "gioi-thieu",
          titleVi: "Nội dung do admin sửa",
          bodyVi: "<p>Keep this edit</p>",
          status: "DRAFT",
        },
      });
      const dated = await database.content.create({
        data: {
          kind: "MILESTONE",
          slug: "custom-date",
          titleVi: "Old title",
          titleEn: "Old title",
          summaryVi: "Old summary",
          summaryEn: "Old summary",
          bodyVi: "<p>Old body</p>",
          bodyEn: "<p>Old body</p>",
          milestone: { create: { eraVi: "2013", eraEn: "2013" } },
        },
        include: { milestone: true },
      });
      const datedHash = editorialFingerprint(dated);
      await database.historyMilestone.update({
        where: { contentId: dated.id },
        data: { yearFrom: 1900 },
      });
      const revision = {
        ...culturalContent,
        entries: [
          {
            ...culturalContent.entries[0],
            slug: old.slug,
            expectedHash: editorialFingerprint(old),
          },
          culturalContent.entries.find((entry) => entry.slug === "lich-su")!,
          culturalContent.entries.find((entry) => entry.slug === "gioi-thieu")!,
          {
            ...culturalContent.entries[0],
            slug: dated.slug,
            expectedHash: datedHash,
          },
        ],
      };
      const result = await Promise.all([
        enrichCulturalContent(database, revision),
        enrichCulturalContent(database, revision),
      ]);
      expect(result.filter((row) => row.applied)).toHaveLength(1);
      expect(result.find((row) => row.applied)).toMatchObject({
        created: 1,
        updated: 1,
        preserved: 2,
      });
      const changed = await database.content.findUniqueOrThrow({
        where: { id: old.id },
        include: { milestone: true },
      });
      expect(changed.titleVi).toBe(revision.entries[0].titleVi);
      expect(changed.milestone?.eraVi).toBe(revision.entries[0].eraVi);
      expect(changed.status).toBe("DRAFT");
      expect(changed.mediaId).toBe(old.mediaId);
      expect(changed.publishedAt).toEqual(old.publishedAt);
      expect(
        await database.content.findUnique({ where: { id: custom.id } }),
      ).toEqual(custom);
      expect(await database.page.count()).toBe(1);
      expect(
        await database.historyMilestone.findUnique({
          where: { contentId: dated.id },
        }),
      ).toMatchObject({ yearFrom: 1900 });
      const backup = await database.siteSetting.findUniqueOrThrow({
        where: { key: `content-backup:${revision.version}` },
      });
      expect(JSON.stringify(backup.value)).toContain("Old title");
      expect(JSON.stringify(backup.value)).not.toContain("Keep this edit");
      await database.content.update({
        where: { id: old.id },
        data: { titleVi: "Chỉnh sửa sau cập nhật" },
      });
      expect(await enrichCulturalContent(database, revision)).toMatchObject({
        applied: false,
      });
      expect(
        await database.content.findUniqueOrThrow({ where: { id: old.id } }),
      ).toMatchObject({ titleVi: "Chỉnh sửa sau cập nhật" });
      expect(
        await database.siteSetting.findUnique({ where: { key: backup.key } }),
      ).toEqual(backup);
    });
  });
  it("rolls back content, backup and marker together when a related record cannot be created", async () => {
    await isolated(async (database, schema) => {
      await database.$executeRawUnsafe(
        `CREATE FUNCTION "${schema}".reject_page() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'editorial rollback fixture'; END; $$ LANGUAGE plpgsql`,
      );
      await database.$executeRawUnsafe(
        `CREATE TRIGGER reject_page BEFORE INSERT ON "${schema}"."Page" FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_page()`,
      );
      const page = culturalContent.entries.find(
        (entry) => entry.slug === "lich-su",
      )!;
      await expect(
        enrichCulturalContent(database, {
          ...culturalContent,
          entries: [page],
        }),
      ).rejects.toThrow("editorial rollback fixture");
      expect(await database.content.count()).toBe(0);
      expect(await database.siteSetting.count()).toBe(0);
    });
  });
});
