import { db } from "./db";
import { dateLabel } from "./domain";
import { getSettings } from "./content";
export async function publicSessions(workshopId?: string) {
  const now = new Date();
  const settings = await getSettings();
  const rows = await db.workshopSession.findMany({
    where: {
      ...(workshopId ? { workshopId } : {}),
      startsAt: { gt: now },
      workshop: {
        content: {
          status: "PUBLISHED",
          publishedAt: { lte: now },
          ...(process.env.APP_MODE === "production" ? { isDemo: false } : {}),
        },
      },
    },
    include: {
      workshop: { include: { content: true } },
      registrations: {
        where: { status: { in: ["NEW", "CONFIRMED"] } },
        select: { adults: true, children: true },
      },
      holds: {
        where: { consumedAt: null, releasedAt: null, expiresAt: { gt: now } },
        include: { registration: { select: { adults: true, children: true } } },
      },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    workshopId: row.workshopId,
    slug: row.workshop.content.slug,
    titleVi: row.workshop.content.titleVi,
    titleEn: row.workshop.content.titleEn,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    deadline: row.registerDeadline.toISOString(),
    capacity: row.capacity,
    almostPercent: settings.almostFullPercent,
    available:
      row.capacity -
      row.registrations.reduce((n, r) => n + r.adults + r.children, 0) -
      row.holds.reduce(
        (n, h) => n + h.registration.adults + h.registration.children,
        0,
      ),
    language: row.language,
    priceAdult: row.workshop.priceAdult,
    priceChild: row.workshop.priceChild,
    status:
      row.status === "OPEN" && row.registerDeadline > now ? "OPEN" : "CLOSED",
    labelVi: dateLabel(row.startsAt),
    labelEn: dateLabel(row.startsAt, "en"),
  }));
}
export type PublicSession = Awaited<ReturnType<typeof publicSessions>>[number];
