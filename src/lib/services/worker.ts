import fs from "node:fs/promises";
import nodemailer from "nodemailer";
import { db } from "../db";
import {
  lockSession,
  inviteWaiting,
  enqueueRegistration,
} from "./registration";
import { sourceIsActive } from "./cms";
import { productionGuard } from "../config";
export async function runScheduled(now = new Date()) {
  productionGuard();
  const sessions = await db.workshopSession.findMany({
    where: {
      OR: [
        { status: "OPEN" },
        {
          holds: {
            some: {
              releasedAt: null,
              consumedAt: null,
              expiresAt: { lte: now },
            },
          },
        },
      ],
    },
    select: { id: true },
  });
  for (const session of sessions)
    await db.$transaction(async (tx) => {
      await lockSession(tx, session.id);
      const expired = await tx.hold.findMany({
        where: {
          sessionId: session.id,
          releasedAt: null,
          consumedAt: null,
          expiresAt: { lte: now },
        },
      });
      for (const hold of expired) {
        await tx.hold.update({
          where: { id: hold.id },
          data: { releasedAt: now },
        });
        await tx.registration.updateMany({
          where: { id: hold.registrationId, status: "WAITLIST" },
          data: { status: "CANCELLED", cancelledAt: now },
        });
      }
      await inviteWaiting(tx, session.id, now);
      await tx.workshopSession.updateMany({
        where: {
          id: session.id,
          status: "OPEN",
          registerDeadline: { lte: now },
        },
        data: { status: "CLOSED" },
      });
    });
  const scheduled = await db.content.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    include: { video: true, media: true },
  });
  for (const content of scheduled) {
    if (content.video) {
      try {
        if (!content.media || !content.video.durationSec) continue;
        await sourceIsActive(content.video.sourceUrl);
      } catch {
        continue;
      }
    }
    await db.content.updateMany({
      where: { id: content.id, status: "SCHEDULED" },
      data: { status: "PUBLISHED", publishedAt: now },
    });
  }
  const reminders = await db.registration.findMany({
    where: {
      status: "CONFIRMED",
      remindedAt: null,
      session: {
        startsAt: { gte: now, lte: new Date(now.getTime() + 24 * 3600000) },
        status: { not: "CANCELLED" },
      },
    },
    select: { id: true, sessionId: true },
  });
  for (const reminder of reminders)
    await db.$transaction(async (tx) => {
      await lockSession(tx, reminder.sessionId);
      const row = await tx.registration.findUniqueOrThrow({
        where: { id: reminder.id },
        include: { session: true },
      });
      if (
        row.status !== "CONFIRMED" ||
        row.remindedAt ||
        row.session.status === "CANCELLED" ||
        row.session.startsAt <= now
      )
        return;
      await enqueueRegistration(tx, row.id, "reminder24h");
      await tx.registration.update({
        where: { id: row.id },
        data: { remindedAt: now },
      });
    });
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 24);
  const old = await db.registration.findMany({
    where: { anonymizedAt: null, session: { endsAt: { lt: cutoff } } },
    select: { id: true },
  });
  if (old.length)
    await db.$transaction(async (tx) => {
      for (const row of old) {
        await tx.registration.update({
          where: { id: row.id },
          data: {
            fullName: "Ẩn danh",
            phone: "",
            email: "anonymous@example.invalid",
            note: "",
            internalNote: "",
            anonymizedAt: now,
          },
        });
        await tx.outbox.updateMany({
          where: { registrationId: row.id },
          data: {
            recipient: "anonymous@example.invalid",
            body: "[PII removed]",
            ics: null,
            status: "REDACTED",
          },
        });
      }
    });
  await db.siteSetting.upsert({
    where: { key: "worker-heartbeat" },
    create: {
      key: "worker-heartbeat",
      value: { lastRun: now.toISOString(), anonymized: old.length },
    },
    update: { value: { lastRun: now.toISOString(), anonymized: old.length } },
  });
  return { anonymized: old.length };
}
export async function deliverOne(now = new Date()) {
  const job = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM "Outbox" WHERE (status='PENDING' AND "availableAt"<=${now}) OR (status='SENDING' AND "claimedAt"<${new Date(now.getTime() - 300000)}) ORDER BY "createdAt",id LIMIT 1 FOR UPDATE SKIP LOCKED`;
    if (!rows[0]) return null;
    return tx.outbox.update({
      where: { id: rows[0].id },
      data: { status: "SENDING", claimedAt: now, attempts: { increment: 1 } },
    });
  });
  if (!job) return false;
  if (job.registrationId && job.expectedStatus) {
    const row = await db.registration.findUnique({
      where: { id: job.registrationId },
      include: { session: true },
    });
    if (
      !row ||
      row.status !== job.expectedStatus ||
      (job.dedupeKey.endsWith("reminder24h") &&
        (row.session.status === "CANCELLED" || row.session.startsAt <= now))
    ) {
      await db.outbox.update({
        where: { id: job.id },
        data: { status: "OBSOLETE" },
      });
      return true;
    }
  }
  try {
    let local = false;
    if (process.env.MAIL_MODE === "local") {
      if (process.env.APP_MODE !== "prototype")
        throw new Error("Local email adapter forbidden");
      local = true;
      await fs.mkdir(".local/mail", { recursive: true });
      await fs
        .writeFile(
          `.local/mail/${job.id}.json`,
          JSON.stringify(
            {
              adapter: "LOCAL_CAPTURE_ONLY_NOT_SENT",
              id: job.id,
              to: job.recipient,
              subject: job.subject,
              text: job.body,
              ics: job.ics,
            },
            null,
            2,
          ),
          { flag: "wx" },
        )
        .catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "EEXIST") throw error;
        });
    } else {
      if (!process.env.SMTP_HOST) throw new Error("SMTP not configured");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_PORT === "465",
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: job.recipient,
        subject: job.subject,
        text: job.body,
        messageId: `<${job.id}@dongho-outbox>`,
        ...(job.ics
          ? {
              attachments: [
                {
                  filename: "workshop.ics",
                  content: job.ics,
                  contentType: "text/calendar",
                },
              ],
            }
          : {}),
      });
    }
    await db.$transaction(async (tx) => {
      await tx.outbox.update({
        where: { id: job.id },
        data: {
          status: local ? "LOCAL_CAPTURED" : "SENT",
          sentAt: local ? null : new Date(),
          lastError: null,
        },
      });
      if (job.isReply && job.contactId && !local)
        await tx.contactMessage.update({
          where: { id: job.contactId },
          data: { status: "REPLIED" },
        });
    });
  } catch (error) {
    await db.outbox.update({
      where: { id: job.id },
      data: {
        status: job.attempts >= 3 ? "FAILED" : "PENDING",
        availableAt: new Date(now.getTime() + 2 ** job.attempts * 60000),
        lastError: error instanceof Error ? error.name : "DeliveryError",
      },
    });
  }
  return true;
}
