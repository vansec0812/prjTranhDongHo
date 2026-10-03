import { randomBytes } from "node:crypto";
import { db } from "../db";
import type { Prisma } from "@prisma/client";
import { contactSchema, DomainError } from "../domain";
import { hash } from "../ids";
export async function createContact(
  input: unknown,
  attachments: Prisma.MediaCreateWithoutContactMessageInput[] = [],
) {
  const data = contactSchema.parse(input);
  if (
    data.artisanId &&
    !(await db.artisan.findFirst({
      where: {
        id: data.artisanId,
        content: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      },
    }))
  )
    throw new DomainError("REFERENCE_NOT_FOUND", 404);
  if (
    data.paintingId &&
    !(await db.painting.findFirst({
      where: {
        id: data.paintingId,
        content: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      },
    }))
  )
    throw new DomainError("REFERENCE_NOT_FOUND", 404);
  return db.$transaction(async (tx) => {
    const contact = await tx.contactMessage.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email.toLowerCase(),
        message: data.message,
        topic: data.topic,
        artisanId: data.artisanId || null,
        paintingId: data.paintingId || null,
        language: data.language,
        consentAt: new Date(),
        policyVersion: "prototype-2026-10-02",
        attachments: { create: attachments },
      },
    });
    await tx.outbox.createMany({
      data: [
        {
          dedupeKey: `contact:${contact.id}:guest`,
          recipient: contact.email,
          subject:
            data.language === "en" ? "Message received" : "Đã nhận lời nhắn",
          body:
            data.language === "en"
              ? "Your message has been saved. The studio will respond."
              : "Lời nhắn đã được lưu. Xưởng sẽ phản hồi sau khi đọc.",
        },
        {
          dedupeKey: `contact:${contact.id}:admin`,
          recipient: process.env.ADMIN_NOTIFY_EMAIL ?? "admin@example.invalid",
          subject: "Liên hệ mới",
          body: `Có liên hệ mới trong hộp thư quản trị.\n${process.env.SITE_URL}/admin/hop-thu`,
        },
      ],
    });
    return { id: contact.id };
  });
}
export async function subscribe(email: string, language: string) {
  return db.$transaction(async (tx) => {
    const old = await tx.subscriber.findUnique({ where: { email } });
    if (old?.confirmedAt && !old.unsubscribedAt) return { accepted: true };
    const subscriber = await tx.subscriber.upsert({
      where: { email },
      create: {
        email,
        language,
        consentAt: new Date(),
        policyVersion: "prototype-2026-10-02",
      },
      update: { language, consentAt: new Date(), unsubscribedAt: null },
    });
    const raw = randomBytes(32).toString("base64url");
    await tx.token.create({
      data: {
        hash: hash(raw),
        purpose: "newsletter-confirm",
        subjectId: subscriber.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await tx.outbox.create({
      data: {
        dedupeKey: `newsletter:${hash(raw)}`,
        recipient: email,
        subject:
          language === "en"
            ? "Confirm your subscription"
            : "Xác nhận đăng ký nhận bản tin",
        body: `${process.env.SITE_URL}${language === "en" ? "/en" : ""}/ban-tin?token=${raw}&action=confirm`,
      },
    });
    return { accepted: true };
  });
}
export async function newsletterToken(
  raw: string,
  action: "confirm" | "unsubscribe",
) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM "Token" WHERE hash=${hash(raw)} FOR UPDATE`;
    const token = rows[0]
      ? await tx.token.findUnique({ where: { id: rows[0].id } })
      : null;
    if (
      !token ||
      token.expiresAt < new Date() ||
      token.purpose !== `newsletter-${action}`
    )
      throw new DomainError("TOKEN_INVALID", 409);
    if (token.usedAt && action === "unsubscribe") return { done: true };
    if (token.usedAt) throw new DomainError("TOKEN_INVALID", 409);
    await tx.token.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
    const subscriber = await tx.subscriber.update({
      where: { id: token.subjectId },
      data:
        action === "confirm"
          ? { confirmedAt: new Date(), unsubscribedAt: null }
          : { unsubscribedAt: new Date() },
    });
    if (action === "confirm") {
      const unsubscribe = randomBytes(32).toString("base64url");
      await tx.token.create({
        data: {
          hash: hash(unsubscribe),
          purpose: "newsletter-unsubscribe",
          subjectId: subscriber.id,
          expiresAt: new Date(Date.now() + 10 * 365 * 86400000),
        },
      });
      await tx.outbox.create({
        data: {
          dedupeKey: `newsletter-welcome:${token.id}`,
          recipient: subscriber.email,
          subject:
            subscriber.language === "en"
              ? "Subscription confirmed"
              : "Đã xác nhận bản tin",
          body: `${process.env.SITE_URL}/ban-tin?token=${unsubscribe}&action=unsubscribe`,
        },
      });
    }
    return { done: true };
  });
}
