import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "../../src/lib/db";
import {
  createRegistration,
  cancelRegistration,
  sessionUsage,
  lockSession,
  inviteWaiting,
  acceptInvitation,
  updateSession,
} from "../../src/lib/services/registration";
import { runScheduled, deliverOne } from "../../src/lib/services/worker";
import {
  createContact,
  subscribe,
  newsletterToken,
} from "../../src/lib/services/contact";
import { hash } from "../../src/lib/ids";
import { normalizePhone } from "../../src/lib/domain";
const now = new Date("2026-10-02T02:00:00Z");
async function fixture(capacity: number) {
  const tag = randomUUID();
  const content = await db.content.create({
    data: {
      kind: "WORKSHOP",
      slug: "test-" + tag,
      titleVi: "Workshop kiểm thử",
      titleEn: "Test workshop",
      status: "PUBLISHED",
      publishedAt: new Date("2026-09-01"),
      isDemo: true,
    },
  });
  const workshop = await db.workshop.create({
    data: {
      contentId: content.id,
      priceAdult: 150000,
      priceChild: 100000,
      durationMin: 120,
      minAge: 6,
      locationVi: "Test",
      locationEn: "Test",
      includesVi: "Test",
      includesEn: "Test",
    },
  });
  const session = await db.workshopSession.create({
    data: {
      workshopId: workshop.id,
      startsAt: new Date("2026-10-10T02:00:00Z"),
      endsAt: new Date("2026-10-10T04:00:00Z"),
      registerDeadline: new Date("2026-10-09T14:00:00Z"),
      capacity,
    },
  });
  return session;
}
function input(sessionId: string, n = 0, adults = 1, children = 0) {
  return {
    sessionId,
    fullName: "Test guest",
    phone: `+1202555${String(100 + n).padStart(4, "0")}`,
    email: `test-${n}@example.invalid`,
    adults,
    children,
    language: "en",
    note: "",
    consent: true,
    idempotencyKey: randomUUID(),
    captcha: "test",
    website: "",
  };
}
afterAll(() => db.$disconnect());
describe("QA-03 real PostgreSQL transaction invariants", () => {
  it("20 concurrent requests compete for 5 seats without overselling", async () => {
    const s = await fixture(5);
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        createRegistration(input(s.id, i), now),
      ),
    );
    expect(results.filter((r) => r.status === "NEW")).toHaveLength(5);
    expect(results.filter((r) => r.status === "WAITLIST")).toHaveLength(15);
    expect(await db.$transaction((tx) => sessionUsage(tx, s.id, now))).toBe(5);
  });
  it("BR-02 simultaneous requests permit only two active registrations per normalized phone", async () => {
    const s = await fixture(20);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => createRegistration(input(s.id, 30), now)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(
      await db.registration.count({
        where: { sessionId: s.id, status: "NEW" },
      }),
    ).toBe(2);
  });
  it("ENG-03 double submit is idempotent and changed payload is rejected", async () => {
    const s = await fixture(20);
    const data = input(s.id, 40);
    const results = await Promise.all([
      createRegistration(data, now),
      createRegistration(data, now),
    ]);
    expect(results[0].id).toBe(results[1].id);
    await expect(
      createRegistration({ ...data, adults: 2 }, now),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("oversized group waits as a whole; children consume capacity", async () => {
    const s = await fixture(2);
    const first = await createRegistration(input(s.id, 50, 1, 1), now);
    const next = await createRegistration(input(s.id, 51, 1, 0), now);
    expect(first.status).toBe("NEW");
    expect(next.status).toBe("WAITLIST");
    expect(await db.$transaction((tx) => sessionUsage(tx, s.id, now))).toBe(2);
  });
  it("BR-03 server blocks the exact registration deadline", async () => {
    const s = await fixture(2);
    await expect(
      createRegistration(input(s.id, 60), s.registerDeadline),
    ).rejects.toMatchObject({ code: "REGISTRATION_CLOSED" });
  });
  it("FIFO does not skip a first group that cannot fit", async () => {
    const s = await fixture(3);
    const full = await createRegistration(input(s.id, 70, 3), now);
    await createRegistration(input(s.id, 71, 4), new Date(now.getTime() + 1));
    await createRegistration(input(s.id, 72, 1), new Date(now.getTime() + 2));
    await cancelRegistration(
      full.code,
      normalizePhone(input(s.id, 70).phone),
      now,
    );
    expect(await db.hold.count({ where: { sessionId: s.id } })).toBe(0);
  });
  it("cancellation invites once; hold acceptance counts once under simultaneous requests", async () => {
    const s = await fixture(2);
    const full = await createRegistration(input(s.id, 80, 2), now);
    const waiting = await createRegistration(
      input(s.id, 81, 2),
      new Date(now.getTime() + 1),
    );
    await cancelRegistration(full.code, input(s.id, 80).phone, now);
    const hold = await db.hold.findUniqueOrThrow({
      where: { registrationId: waiting.id },
    });
    expect(hold.expiresAt.getTime()).toBe(now.getTime() + 12 * 3600000);
    await db.$transaction(async (tx) => {
      await lockSession(tx, s.id);
      await inviteWaiting(tx, s.id, now);
    });
    expect(await db.hold.count({ where: { sessionId: s.id } })).toBe(1);
    const job = await db.outbox.findUniqueOrThrow({
      where: { dedupeKey: `hold:${waiting.id}` },
    });
    const token = job.body.match(/invite=([^\s]+)/)?.[1];
    expect(token).toBeTruthy();
    const results = await Promise.allSettled([
      acceptInvitation(token!, waiting.code, input(s.id, 81).phone, now),
      acceptInvitation(token!, waiting.code, input(s.id, 81).phone, now),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.$transaction((tx) => sessionUsage(tx, s.id, now))).toBe(2);
  });
  it("expired holds release capacity and the next group is invited idempotently", async () => {
    const s = await fixture(1);
    const full = await createRegistration(input(s.id, 90), now);
    const first = await createRegistration(
      input(s.id, 91),
      new Date(now.getTime() + 1),
    );
    const second = await createRegistration(
      input(s.id, 92),
      new Date(now.getTime() + 2),
    );
    await cancelRegistration(full.code, input(s.id, 90).phone, now);
    await runScheduled(new Date(now.getTime() + 12 * 3600000));
    await runScheduled(new Date(now.getTime() + 12 * 3600000));
    expect(
      (await db.registration.findUniqueOrThrow({ where: { id: first.id } }))
        .status,
    ).toBe("CANCELLED");
    expect(await db.hold.count({ where: { registrationId: second.id } })).toBe(
      1,
    );
  });
  it("capacity cannot shrink below held seats and cancellation preserves attendance history", async () => {
    const s = await fixture(2);
    await createRegistration(input(s.id, 95, 2), now);
    const admin = await db.adminUser.create({
      data: {
        email: `${randomUUID()}@example.invalid`,
        name: "Test admin",
        passwordHash: "test-only-unused",
      },
    });
    await expect(
      updateSession(s.id, { capacity: 1 }, admin.id, now),
    ).rejects.toMatchObject({ code: "CAPACITY_BELOW_OCCUPIED" });
    await updateSession(
      s.id,
      { status: "CANCELLED", reason: "Test cancellation" },
      admin.id,
      now,
    );
    expect(
      await db.registration.count({
        where: { sessionId: s.id, status: "NEW" },
      }),
    ).toBe(0);
    expect(
      await db.registration.count({
        where: { sessionId: s.id, status: "CANCELLED" },
      }),
    ).toBe(1);
    await expect(
      db.auditLog.updateMany({ data: { action: "illegal" } }),
    ).rejects.toThrow();
  });
  it("contact and newsletter commit with outbox; one-time confirmation is enforced", async () => {
    const contact = await createContact({
      fullName: "Test guest",
      phone: "+12025550199",
      email: "contact@example.invalid",
      message: "Đây là lời nhắn kiểm thử hộp thư riêng.",
      topic: "faq",
      language: "vi",
      consent: true,
      captcha: "test",
      website: "",
    });
    expect(
      await db.outbox.count({
        where: { dedupeKey: { startsWith: `contact:${contact.id}` } },
      }),
    ).toBe(2);
    const email = `newsletter-${randomUUID()}@example.invalid`;
    await subscribe(email, "vi");
    const subscriber = await db.subscriber.findUniqueOrThrow({
      where: { email },
    });
    expect(subscriber.confirmedAt).toBeNull();
    const token = "token-" + randomUUID();
    await db.token.create({
      data: {
        hash: hash(token),
        purpose: "newsletter-confirm",
        subjectId: subscriber.id,
        expiresAt: new Date(Date.now() + 10000),
      },
    });
    await newsletterToken(token, "confirm");
    await expect(newsletterToken(token, "confirm")).rejects.toMatchObject({
      code: "TOKEN_INVALID",
    });
    expect(
      (await db.subscriber.findUniqueOrThrow({ where: { email } })).confirmedAt,
    ).not.toBeNull();
  });
  it("email failure retries without losing registrations", async () => {
    const s = await fixture(1);
    const r = await createRegistration(input(s.id, 99), now);
    const jobs = await db.outbox.findMany({ where: { registrationId: r.id } });
    expect(jobs.length).toBe(1);
    expect(
      (await db.registration.findUniqueOrThrow({ where: { id: r.id } })).status,
    ).toBe("NEW");
    const previous = process.env.MAIL_MODE;
    process.env.MAIL_MODE = "smtp";
    const pending = await db.outbox.create({
      data: {
        dedupeKey: randomUUID(),
        recipient: "test@example.invalid",
        subject: "test",
        body: "test",
        availableAt: new Date("2000-01-01"),
      },
    });
    await deliverOne(now);
    expect(
      (await db.outbox.findUniqueOrThrow({ where: { id: pending.id } })).status,
    ).toBe("PENDING");
    process.env.MAIL_MODE = previous;
  });
});
