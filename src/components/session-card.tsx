import type { PublicSession } from "@/lib/sessions";
import type { Locale } from "@/lib/content";
import { localHref } from "@/lib/content";
import { money } from "@/lib/domain";
import { en, vi } from "@/i18n/messages";
import { ButtonLink, Badge } from "./ui";
export function SessionCard({
  session,
  locale,
}: {
  session: PublicSession;
  locale: Locale;
}) {
  const t = (locale === "en" ? en : vi).workshop;
  const date = new Date(session.startsAt);
  const day = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
  const month = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", {
    month: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
  const closed = session.status !== "OPEN";
  const full = session.available === 0;
  const almost =
    session.available > 0 &&
    session.available <= (session.capacity * session.almostPercent) / 100;
  return (
    <article className="session-card">
      <div className="session-date">
        <strong>{day}</strong>
        <span>{month}</span>
      </div>
      <div className="session-body">
        <h3>
          {locale === "en"
            ? session.titleEn || session.titleVi
            : session.titleVi}
        </h3>
        <p className="meta">
          {locale === "en" ? session.labelEn : session.labelVi} ·{" "}
          {session.language === "en" ? "English" : "Tiếng Việt"}
        </p>
        <p className="meta">
          {money(session.priceAdult, locale)} / {t.adults.toLowerCase()}
        </p>
        <Badge error={closed || full || almost}>
          {closed
            ? t.closed
            : full
              ? t.full
              : almost
                ? t.almost
                : `${session.available} / ${session.capacity} ${t.seats}`}
        </Badge>
        <progress
          className="progress"
          max={session.capacity}
          value={session.capacity - session.available}
          aria-label={locale === "en" ? "Seats reserved" : "Số chỗ đã giữ"}
        />
        {!closed && (
          <ButtonLink
            href={localHref(
              locale,
              `/workshop/${session.slug}?buoi=${session.id}#dang-ky`,
            )}
          >
            {full
              ? locale === "en"
                ? "Join waiting list"
                : "Vào danh sách chờ"
              : locale === "en"
                ? "Book this date"
                : "Đăng ký"}
          </ButtonLink>
        )}
      </div>
    </article>
  );
}
