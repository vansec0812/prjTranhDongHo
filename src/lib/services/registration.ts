import { Prisma, RegStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { db } from "../db";
import {
  registrationSchema,
  DomainError,
  totalPrice,
  normalizePhone,
  canCancel,
  allowedTransitions,
} from "../domain";
import { registrationCode, hash } from "../ids";
import { sealPII } from "../security";
import { getSettings } from "../content";
import { calendarFile } from "../ics";
type Tx = Prisma.TransactionClient;
export async function lockSession(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<
    Array<{ id: string }>
  >`SELECT id FROM "WorkshopSession" WHERE id=${id} FOR UPDATE`;
  if (!rows.length) throw new DomainError("SESSION_NOT_FOUND", 404);
}
export async function sessionUsage(tx: Tx, id: string, now: Date) {
  const registrations = await tx.registration.aggregate({
    where: { sessionId: id, status: { in: ["NEW", "CONFIRMED"] } },
    _sum: { adults: true, children: true },
  });
  const holds = await tx.hold.findMany({
    where: {
      sessionId: id,
      consumedAt: null,
      releasedAt: null,
      expiresAt: { gt: now },
    },
    include: { registration: true },
  });
  return (
    (registrations._sum.adults ?? 0) +
    (registrations._sum.children ?? 0) +
    holds.reduce(
      (n, h) => n + h.registration.adults + h.registration.children,
      0,
    )
  );
}
export async function enqueueRegistration(tx: Tx, id: string, event: string) {
  const r = await tx.registration.findUniqueOrThrow({
    where: { id },
    include: {
      session: { include: { workshop: { include: { content: true } } } },
    },
  });
  const en = r.language === "en";
  const title = en
    ? r.session.workshop.content.titleEn || r.session.workshop.content.titleVi
    : r.session.workshop.content.titleVi;
  const labels = {
    WAITLIST: en ? "Waiting list received" : "Đã nhận đăng ký danh sách chờ",
    NEW: en
      ? "Booking received – pending admin confirmation"
      : "Đã nhận đăng ký – chờ admin xác nhận",
    CONFIRMED: en ? "Booking confirmed by admin" : "Admin đã xác nhận đăng ký",
    ATTENDED: en ? "Attendance recorded" : "Đã ghi nhận tham dự",
    NO_SHOW: en ? "Absence recorded" : "Đã ghi nhận vắng mặt",
    CANCELLED: en ? "Booking cancelled" : "Đăng ký đã hủy",
  };
  const subject =
    event === "reminder24h"
      ? en
        ? "Workshop reminder"
        : "Nhắc lịch workshop"
      : labels[r.status];
  const text = `${subject}\n${title}\n${r.code}\n${r.status === "WAITLIST" ? (en ? "No seats are reserved yet." : "Hiện chưa giữ chỗ.") : en ? "Review your status using code + phone." : "Tra cứu bằng mã + SĐT."}\n${process.env.SITE_URL}${en ? "/en" : ""}/workshop/tra-cuu`;
  const withCalendar = ["NEW", "CONFIRMED", "CANCELLED"].includes(r.status);
  await tx.outbox.upsert({
    where: { dedupeKey: `registration:${id}:${event}` },
    create: {
      dedupeKey: `registration:${id}:${event}`,
      recipient: r.email,
      subject,
      body: text,
      registrationId: id,
      expectedStatus: r.status,
      ics: withCalendar
        ? calendarFile(
            r,
            r.session,
            title,
            en ? r.session.workshop.locationEn : r.session.workshop.locationVi,
          )
        : null,
    },
    update: {},
  });
}
export async function createRegistration(input: unknown, referenceNow?: Date) {
  const data = registrationSchema.parse(input);
  const requestHash = hash(
    JSON.stringify({
      sessionId: data.sessionId,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email.toLowerCase(),
      adults: data.adults,
      children: data.children,
      language: data.language,
      note: data.note,
    }),
  );
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          await lockSession(tx, data.sessionId);
          const now = referenceNow ?? new Date();
          const duplicate = await tx.registration.findUnique({
            where: { idempotencyKey: data.idempotencyKey },
          });
          if (duplicate) {
            if (duplicate.requestHash !== requestHash)
              throw new DomainError("IDEMPOTENCY_CONFLICT", 409);
            return {
              code: duplicate.code,
              status: duplicate.status,
              id: duplicate.id,
            };
          }
          const session = await tx.workshopSession.findUniqueOrThrow({
            where: { id: data.sessionId },
            include: { workshop: { include: { content: true } } },
          });
          if (
            session.status !== "OPEN" ||
            session.registerDeadline <= now ||
            session.startsAt <= now ||
            session.workshop.content.status !== "PUBLISHED" ||
            !session.workshop.content.publishedAt ||
            session.workshop.content.publishedAt > now ||
            (process.env.APP_MODE === "production" &&
              session.workshop.content.isDemo)
          )
            throw new DomainError("REGISTRATION_CLOSED", 409);
          const active = await tx.registration.count({
            where: {
              sessionId: session.id,
              phone: data.phone,
              OR: [
                { status: { in: ["NEW", "CONFIRMED"] } },
                {
                  hold: {
                    is: {
                      consumedAt: null,
                      releasedAt: null,
                      expiresAt: { gt: now },
                    },
                  },
                },
              ],
            },
          });
          if (active >= 2) throw new DomainError("PHONE_LIMIT", 409);
          const available =
            session.capacity - (await sessionUsage(tx, session.id, now));
          const status =
            available >= data.adults + data.children ? "NEW" : "WAITLIST";
          if (
            status === "WAITLIST" &&
            (await tx.registration.count({
              where: {
                sessionId: session.id,
                phone: data.phone,
                status: "WAITLIST",
              },
            }))
          )
            throw new DomainError("WAITLIST_DUPLICATE", 409);
          let code = registrationCode(now);
          for (
            let n = 0;
            n < 5 && (await tx.registration.findUnique({ where: { code } }));
            n++
          )
            code = registrationCode(now);
          const registration = await tx.registration.create({
            data: {
              code,
              requestHash,
              idempotencyKey: data.idempotencyKey,
              sessionId: session.id,
              fullName: data.fullName,
              phone: data.phone,
              email: data.email.toLowerCase(),
              adults: data.adults,
              children: data.children,
              language: data.language,
              note: sealPII(data.note),
              priceAdult: session.workshop.priceAdult,
              priceChild: session.workshop.priceChild,
              totalAmount: totalPrice(
                data.adults,
                data.children,
                session.workshop.priceAdult,
                session.workshop.priceChild,
              ),
              status,
              consentAt: now,
              policyVersion: "prototype-2026-10-02",
            },
          });
          await enqueueRegistration(tx, registration.id, "created");
          return {
            code: registration.code,
            status: registration.status,
            id: registration.id,
          };
        },
        { timeout: 15000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (["P2034", "P2002"].includes(error.code) ||
          (error.code === "P2028" &&
            error.message.includes("Unable to start a transaction"))) &&
        attempt < 2
      ) {
        // Pool contention happens before a transaction starts; retry without weakening the seat lock or extending test timeouts.
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * (attempt + 1)),
        );
        continue;
      }
      throw error;
    }
  }
  throw new DomainError("RETRY_REQUIRED", 409);
}
export async function inviteWaiting(tx: Tx, sessionId: string, now: Date) {
  const session = await tx.workshopSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  if (session.status !== "OPEN" || session.registerDeadline <= now) return;
  let available = session.capacity - (await sessionUsage(tx, sessionId, now));
  const queue = await tx.registration.findMany({
    where: { sessionId, status: "WAITLIST", hold: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  for (const registration of queue) {
    const seats = registration.adults + registration.children;
    if (seats > available) break;
    const active = await tx.registration.count({
      where: {
        sessionId,
        phone: registration.phone,
        OR: [
          { status: { in: ["NEW", "CONFIRMED"] } },
          {
            hold: {
              is: {
                consumedAt: null,
                releasedAt: null,
                expiresAt: { gt: now },
              },
            },
          },
        ],
      },
    });
    if (active >= 2) break;
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Math.min(now.getTime() + 12 * 3600000, session.startsAt.getTime()),
    );
    await tx.hold.create({
      data: {
        sessionId,
        registrationId: registration.id,
        tokenHash: hash(token),
        expiresAt,
      },
    });
    await tx.outbox.create({
      data: {
        dedupeKey: `hold:${registration.id}`,
        recipient: registration.email,
        subject:
          registration.language === "en"
            ? "Workshop waiting list invitation"
            : "Lời mời từ danh sách chờ",
        body: `${registration.code}\n${process.env.SITE_URL}${registration.language === "en" ? "/en" : ""}/workshop/tra-cuu?invite=${token}\n${expiresAt.toISOString()}`,
        registrationId: registration.id,
        expectedStatus: "WAITLIST",
      },
    });
    available -= seats;
  }
}
export async function lookupRegistration(code: string, phone: string) {
  const normalized = normalizePhone(phone);
  const r = await db.registration.findFirst({
    where: { code, phone: normalized },
    include: {
      session: { include: { workshop: { include: { content: true } } } },
    },
  });
  if (!r) throw new DomainError("LOOKUP_FAILED", 404);
  return r;
}
export async function cancelRegistration(
  code: string,
  phone: string,
  now = new Date(),
) {
  const registration = await lookupRegistration(code, phone);
  const settings = await getSettings();
  return db.$transaction(async (tx) => {
    await lockSession(tx, registration.sessionId);
    const row = await tx.registration.findUniqueOrThrow({
      where: { id: registration.id },
      include: { session: true },
    });
    if (
      !["WAITLIST", "NEW", "CONFIRMED"].includes(row.status) ||
      !canCancel(row.session.startsAt, now, settings.cancelHours)
    )
      throw new DomainError("CANCEL_UNAVAILABLE", 409);
    await tx.registration.update({
      where: { id: row.id },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    await tx.hold.updateMany({
      where: { registrationId: row.id, consumedAt: null, releasedAt: null },
      data: { releasedAt: now },
    });
    await enqueueRegistration(tx, row.id, "cancelled");
    await inviteWaiting(tx, row.sessionId, now);
    return { status: "CANCELLED" };
  });
}
export async function acceptInvitation(
  token: string,
  code: string,
  phone: string,
  now = new Date(),
) {
  const registration = await lookupRegistration(code, phone);
  return db.$transaction(async (tx) => {
    await lockSession(tx, registration.sessionId);
    const hold = await tx.hold.findFirst({
      where: {
        tokenHash: hash(token),
        registrationId: registration.id,
        consumedAt: null,
        releasedAt: null,
        expiresAt: { gt: now },
      },
    });
    const row = await tx.registration.findUniqueOrThrow({
      where: { id: registration.id },
    });
    if (!hold || row.status !== "WAITLIST")
      throw new DomainError("INVITATION_INVALID", 409);
    const session = await tx.workshopSession.findUniqueOrThrow({
      where: { id: row.sessionId },
    });
    if (session.status === "CANCELLED" || session.startsAt <= now)
      throw new DomainError("INVITATION_INVALID", 409);
    await tx.hold.update({ where: { id: hold.id }, data: { consumedAt: now } });
    await tx.registration.update({
      where: { id: row.id },
      data: { status: "NEW" },
    });
    await enqueueRegistration(tx, row.id, "hold-accepted");
    return { status: "NEW" };
  });
}
export async function changeRegistrationStatus(
  id: string,
  status: RegStatus,
  adminId: string,
  reason: string,
  now = new Date(),
) {
  const initial = await db.registration.findUniqueOrThrow({ where: { id } });
  return db.$transaction(async (tx) => {
    await lockSession(tx, initial.sessionId);
    const row = await tx.registration.findUniqueOrThrow({
      where: { id },
      include: { session: true },
    });
    const allowed: readonly string[] = allowedTransitions[row.status];
    if (!allowed.includes(status))
      throw new DomainError("INVALID_TRANSITION", 409);
    if (["ATTENDED", "NO_SHOW"].includes(status) && row.session.startsAt > now)
      throw new DomainError("TOO_EARLY", 409);
    if (status === "CANCELLED" && !reason.trim())
      throw new DomainError("REASON_REQUIRED");
    await tx.registration.update({
      where: { id },
      data: { status, cancelledAt: status === "CANCELLED" ? now : undefined },
    });
    if (status === "CANCELLED")
      await tx.hold.updateMany({
        where: { registrationId: id, releasedAt: null, consumedAt: null },
        data: { releasedAt: now },
      });
    await tx.auditLog.create({
      data: {
        adminId,
        action: "registration.status",
        entity: "Registration",
        entityId: id,
        diff: { from: row.status, to: status, reason },
      },
    });
    await enqueueRegistration(tx, id, `status-${status}`);
    if (status === "CANCELLED") await inviteWaiting(tx, row.sessionId, now);
    return { status };
  });
}
export async function updateSession(
  id: string,
  data: {
    capacity?: number;
    status?: "OPEN" | "CLOSED" | "CANCELLED";
    reason?: string;
  },
  adminId: string,
  now = new Date(),
) {
  return db.$transaction(async (tx) => {
    await lockSession(tx, id);
    const session = await tx.workshopSession.findUniqueOrThrow({
      where: { id },
    });
    if (session.status === "CANCELLED")
      throw new DomainError("SESSION_FINAL", 409);
    const used = await sessionUsage(tx, id, now);
    if (data.capacity !== undefined && data.capacity < used)
      throw new DomainError("CAPACITY_BELOW_OCCUPIED", 409);
    if (data.status === "CANCELLED") {
      if (!data.reason?.trim()) throw new DomainError("REASON_REQUIRED");
      const active = await tx.registration.findMany({
        where: {
          sessionId: id,
          status: { in: ["NEW", "CONFIRMED", "WAITLIST"] },
        },
      });
      for (const row of active) {
        await tx.registration.update({
          where: { id: row.id },
          data: { status: "CANCELLED", cancelledAt: now },
        });
        await enqueueRegistration(tx, row.id, "session-cancelled");
      }
      await tx.hold.updateMany({
        where: { sessionId: id, consumedAt: null, releasedAt: null },
        data: { releasedAt: now },
      });
    }
    await tx.workshopSession.update({
      where: { id },
      data: { capacity: data.capacity, status: data.status },
    });
    await tx.auditLog.create({
      data: {
        adminId,
        action: "session.update",
        entity: "WorkshopSession",
        entityId: id,
        diff: {
          capacity: data.capacity ?? session.capacity,
          status: data.status ?? session.status,
          reason: data.reason ?? "",
        },
      },
    });
    return { id };
  });
}
