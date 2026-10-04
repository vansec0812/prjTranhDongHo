import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, sealPII } from "@/lib/security";
import { db } from "@/lib/db";
import { saveContent } from "@/lib/services/cms";
import {
  changeRegistrationStatus,
  updateSession,
  enqueueRegistration,
} from "@/lib/services/registration";
import { settingsSchema } from "@/lib/config";
import { DomainError } from "@/lib/domain";
import { apiError } from "@/lib/api";
import {
  dispatchCommittedMail,
  runScheduled,
  drainOutbox,
} from "@/lib/services/worker";
export const maxDuration = 60;
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("worker.run") }),
  z.object({ action: z.literal("content.save"), data: z.unknown() }),
  z.object({ action: z.literal("content.hide"), id: z.string() }),
  z.object({ action: z.literal("content.delete"), id: z.string() }),
  z.object({
    action: z.literal("registration.status"),
    ids: z.array(z.string()).min(1).max(100),
    status: z.enum(["CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELLED"]),
    reason: z.string().max(1000).default(""),
  }),
  z.object({
    action: z.literal("registration.note"),
    id: z.string(),
    note: z.string().max(2000),
  }),
  z.object({ action: z.literal("registration.resend"), id: z.string() }),
  z.object({
    action: z.literal("session.update"),
    id: z.string(),
    capacity: z.number().int().min(1).max(10000).optional(),
    status: z.enum(["OPEN", "CLOSED", "CANCELLED"]).optional(),
    reason: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal("session.create"),
    workshopId: z.string(),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    capacity: z.number().int().min(1).max(10000),
    language: z.enum(["vi", "en"]),
    weeks: z.number().int().min(1).max(12).default(1),
  }),
  z.object({
    action: z.literal("contact.update"),
    id: z.string(),
    status: z.enum(["NEW", "PROCESSING", "ARCHIVED"]),
    note: z.string().max(2000),
  }),
  z.object({
    action: z.literal("contact.reply"),
    id: z.string(),
    body: z.string().min(20).max(5000),
  }),
  z.object({ action: z.literal("settings.save"), data: z.unknown() }),
  z.object({
    action: z.literal("settings.home"),
    stats: settingsSchema.shape.stats.refine(
      (stats) => stats.length === 0 || stats.length >= 3,
    ),
    heroPaintingIds: settingsSchema.shape.heroPaintingIds,
  }),
  z.object({
    action: z.literal("category.save"),
    id: z.string().optional(),
    kind: z.enum(["PAINTING", "VIDEO"]),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    titleVi: z.string().min(2).max(100),
    titleEn: z.string().max(100),
  }),
  z.object({ action: z.literal("email.retry"), id: z.string() }),
  z.object({ action: z.literal("media.delete"), id: z.string() }),
]);
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    checkOrigin(request);
    const data = schema.parse(await request.json());
    switch (data.action) {
      case "worker.run":
        await runScheduled();
        await drainOutbox(20, 35000);
        await db.auditLog.create({
          data: {
            adminId: admin.id,
            action: "worker.run",
            entity: "Job",
            entityId: "scheduled",
            diff: { triggered: true },
          },
        });
        break;
      case "content.delete": {
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Content" WHERE id=${data.id} FOR UPDATE`;
          const content = await tx.content.findUnique({
            where: { id: data.id },
          });
          if (!content) throw new DomainError("CONTENT_NOT_FOUND", 404);
          // Restrict FKs retain registrations, inbox references, video views and products.
          // A referenced record must be hidden instead of destroying its history.
          const where = { contentId: content.id };
          try {
            switch (content.kind) {
              case "PAGE":
                await tx.page.deleteMany({ where });
                break;
              case "MILESTONE":
                await tx.historyMilestone.deleteMany({ where });
                break;
              case "PAINTING":
                await tx.painting.deleteMany({ where });
                break;
              case "VIDEO":
                await tx.video.deleteMany({ where });
                break;
              case "WORKSHOP":
                await tx.workshop.deleteMany({ where });
                break;
              case "ARTISAN":
                await tx.artisan.deleteMany({ where });
                break;
              case "POST":
                await tx.post.deleteMany({ where });
                break;
              case "PRODUCT":
                await tx.product.deleteMany({ where });
                break;
              case "FAQ":
                await tx.faq.deleteMany({ where });
                break;
              case "HERO":
                await tx.heroSlide.deleteMany({ where });
                break;
            }
            await tx.content.delete({ where: { id: data.id } });
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2003"
            )
              throw new DomainError("CONTENT_REFERENCED", 409);
            throw error;
          }
          await tx.auditLog.create({
            data: {
              adminId: admin.id,
              action: "content.delete",
              entity: content.kind,
              entityId: content.id,
              diff: { deleted: true },
            },
          });
        });
        break;
      }
      case "content.save":
        return NextResponse.json(await saveContent(data.data, admin.id));
      case "content.hide": {
        await db.$transaction(async (tx) => {
          const item = await tx.content.update({
            where: { id: data.id },
            data: { status: "DRAFT" },
          });
          await tx.auditLog.create({
            data: {
              adminId: admin.id,
              action: "content.hide",
              entity: item.kind,
              entityId: item.id,
              diff: { status: "DRAFT" },
            },
          });
        });
        break;
      }
      case "registration.status": {
        const results = [];
        for (const id of data.ids) {
          try {
            await changeRegistrationStatus(
              id,
              data.status,
              admin.id,
              data.reason,
            );
            results.push({ id, ok: true });
          } catch (error) {
            results.push({
              id,
              ok: false,
              error:
                error instanceof DomainError
                  ? error.code
                  : "Không thể cập nhật",
            });
          }
        }
        return NextResponse.json(
          { results },
          { status: results.some((r) => !r.ok) ? 207 : 200 },
        );
      }
      case "registration.note":
        await db.$transaction(async (tx) => {
          await tx.registration.update({
            where: { id: data.id },
            data: { internalNote: sealPII(data.note) },
          });
          await tx.auditLog.create({
            data: {
              adminId: admin.id,
              action: "registration.note",
              entity: "Registration",
              entityId: data.id,
              diff: { changed: true },
            },
          });
        });
        break;
      case "registration.resend":
        await db.$transaction((tx) =>
          enqueueRegistration(tx, data.id, `resend-${crypto.randomUUID()}`),
        );
        break;
      case "session.update":
        return NextResponse.json(await updateSession(data.id, data, admin.id));
      case "session.create": {
        const startsAt = new Date(data.startsAt),
          endsAt = new Date(data.endsAt);
        if (endsAt <= startsAt || startsAt <= new Date())
          throw new DomainError("SESSION_TIMES_INVALID", 422);
        await db.$transaction(async (tx) => {
          for (let i = 0; i < data.weeks; i++) {
            const start = new Date(startsAt.getTime() + i * 7 * 86400000),
              end = new Date(endsAt.getTime() + i * 7 * 86400000);
            const row = await tx.workshopSession.create({
              data: {
                workshopId: data.workshopId,
                startsAt: start,
                endsAt: end,
                capacity: data.capacity,
                language: data.language,
                registerDeadline: new Date(start.getTime() - 12 * 3600000),
              },
            });
            await tx.auditLog.create({
              data: {
                adminId: admin.id,
                action: "session.create",
                entity: "WorkshopSession",
                entityId: row.id,
                diff: {
                  startsAt: start.toISOString(),
                  capacity: data.capacity,
                },
              },
            });
          }
        });
        break;
      }
      case "contact.update":
        await db.$transaction(async (tx) => {
          await tx.contactMessage.update({
            where: { id: data.id },
            data: { status: data.status, internalNote: sealPII(data.note) },
          });
          await tx.auditLog.create({
            data: {
              adminId: admin.id,
              action: "contact.update",
              entity: "ContactMessage",
              entityId: data.id,
              diff: { status: data.status, noteChanged: true },
            },
          });
        });
        break;
      case "contact.reply": {
        const row = await db.contactMessage.findUniqueOrThrow({
          where: { id: data.id },
        });
        await db.$transaction(async (tx) => {
          await tx.outbox.create({
            data: {
              dedupeKey: `reply:${row.id}:${crypto.randomUUID()}`,
              recipient: row.email,
              subject: "Phản hồi từ xưởng tranh Đông Hồ",
              body: data.body,
              contactId: row.id,
              isReply: true,
            },
          });
          await tx.auditLog.create({
            data: {
              adminId: admin.id,
              action: "contact.reply.enqueue",
              entity: "ContactMessage",
              entityId: row.id,
              diff: { queued: true },
            },
          });
        });
        return NextResponse.json({
          message:
            "Đã đưa email vào hàng đợi. Chỉ chuyển Đã trả lời khi nhà cung cấp nhận email; local capture không chuyển trạng thái.",
        });
      }
      case "settings.save": {
        const settings = settingsSchema.parse(data.data);
        for (const url of [
          settings.zalo,
          settings.messenger,
          settings.facebook,
        ])
          if (url && !url.startsWith("https://"))
            throw new DomainError("HTTPS_REQUIRED", 422);
        await db.$transaction(async (tx) => {
          await tx.siteSetting.upsert({
            where: { key: "site" },
            create: { key: "site", value: settings },
            update: { value: settings },
          });
          await tx.auditLog.create({
            data: {
              adminId: admin.id,
              action: "settings.update",
              entity: "SiteSetting",
              entityId: "site",
              diff: { updated: true },
            },
          });
        });
        break;
      }
      case "settings.home": {
        if (
          data.heroPaintingIds.length &&
          (await db.content.count({
            where: {
              id: { in: data.heroPaintingIds },
              kind: "PAINTING",
              status: "PUBLISHED",
              publishedAt: { lte: new Date() },
            },
          })) !== 3
        )
          throw new DomainError("PAINTINGS_NOT_PUBLISHED", 422);
        if (data.stats.some((s) => !s.value.trim() || !s.labelVi.trim()))
          throw new DomainError("STATS_INCOMPLETE", 422);
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT key FROM "SiteSetting" WHERE key='site' FOR UPDATE`;
          const existing = await tx.siteSetting.findUnique({
            where: { key: "site" },
          });
          const settings = settingsSchema.parse({
            ...settingsSchema.parse(existing?.value ?? {}),
            stats: data.stats,
            heroPaintingIds: data.heroPaintingIds,
          });
          await tx.siteSetting.upsert({
            where: { key: "site" },
            create: { key: "site", value: settings },
            update: { value: settings },
          });
          await tx.auditLog.create({
            data: {
              adminId: admin.id,
              action: "settings.home",
              entity: "SiteSetting",
              entityId: "site",
              diff: {
                statCount: data.stats.length,
                heroPaintingIds: data.heroPaintingIds,
              },
            },
          });
        });
        break;
      }
      case "category.save":
        await db.$transaction(async (tx) => {
          const row = data.id
            ? await tx.category.update({
                where: { id: data.id },
                data: { titleVi: data.titleVi, titleEn: data.titleEn },
              })
            : await tx.category.create({
                data: {
                  kind: data.kind,
                  slug: data.slug,
                  titleVi: data.titleVi,
                  titleEn: data.titleEn,
                },
              });
          if (data.kind === "PAINTING")
            await tx.paintingCategory.upsert({
              where: { categoryId: row.id },
              create: { categoryId: row.id },
              update: {},
            });
          else
            await tx.videoCategory.upsert({
              where: { categoryId: row.id },
              create: { categoryId: row.id },
              update: {},
            });
          await tx.auditLog.create({
            data: {
              adminId: admin.id,
              action: "category.save",
              entity: "Category",
              entityId: row.id,
              diff: { kind: data.kind },
            },
          });
        });
        break;
      case "email.retry":
        await db.$transaction(async (tx) => {
          const job = await tx.outbox.findUniqueOrThrow({
            where: { id: data.id },
          });
          if (job.status !== "FAILED")
            throw new DomainError("EMAIL_NOT_FAILED", 409);
          await tx.outbox.update({
            where: { id: data.id },
            data: {
              status: "PENDING",
              attempts: 0,
              availableAt: new Date(),
              lastError: null,
            },
          });
          await tx.auditLog.create({
            data: {
              adminId: admin.id,
              action: "email.retry",
              entity: "Outbox",
              entityId: data.id,
              diff: { retry: true },
            },
          });
        });
        break;
      case "media.delete":
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Media" WHERE id=${data.id} FOR UPDATE`;
          const row = await tx.media.findUniqueOrThrow({
            where: { id: data.id },
            include: { _count: { select: { contents: true } } },
          });
          if (row._count.contents || row.contactMessageId)
            throw new DomainError("MEDIA_IN_USE", 409);
          await tx.media.delete({ where: { id: data.id } });
          await tx.auditLog.create({
            data: {
              adminId: admin.id,
              action: "media.delete-reference",
              entity: "Media",
              entityId: data.id,
              diff: { orphanCleanupPending: true },
            },
          });
        });
        break;
    }
    if (data.action !== "worker.run") await dispatchCommittedMail();
    return NextResponse.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
