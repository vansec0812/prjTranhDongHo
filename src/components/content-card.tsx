import Image from "next/image";
import { Play } from "lucide-react";
import type { ContentRecord, Locale } from "@/lib/content";
import { text, summary, contentHref } from "@/lib/content";
import { mediaUrl } from "@/lib/media-url";
import { en, vi } from "@/i18n/messages";
export function MediaView({
  item,
  locale,
  painting = false,
  priority = false,
  showSummary = false,
  summaryLink = false,
}: {
  item: ContentRecord;
  locale: Locale;
  painting?: boolean;
  priority?: boolean;
  showSummary?: boolean;
  summaryLink?: boolean;
}) {
  const t = locale === "en" ? en : vi;
  return (
    <>
      <div
        className={painting ? "painting-media" : "card-media"}
        tabIndex={showSummary && !summaryLink ? 0 : undefined}
      >
        {item.media ? (
          <Image
            src={mediaUrl(item.media)}
            alt={
              locale === "en"
                ? item.media.altEn.trim() || item.media.altVi
                : item.media.altVi
            }
            lang={locale === "en" && !item.media.altEn.trim() ? "vi" : locale}
            width={item.media.width ?? 300}
            height={item.media.height ?? 400}
            sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 33vw"
            priority={priority}
            unoptimized={item.media.isDemo}
          />
        ) : (
          <span className="small">{t.site.noData}</span>
        )}
        {showSummary && summary(item, locale) && (
          <span
            className="image-summary"
            lang={locale === "en" && !item.summaryEn ? "vi" : locale}
          >
            {summary(item, locale)}
            {summaryLink && (
              <span className="summary-action">{t.site.more} →</span>
            )}
          </span>
        )}
        {item.kind === "VIDEO" && (
          <>
            <span className="play-seal" aria-hidden="true">
              <Play size={20} />
            </span>
            {Boolean(item.video?.durationSec) && (
              <span className="duration">
                {Math.floor((item.video?.durationSec ?? 0) / 60)}:
                {String((item.video?.durationSec ?? 0) % 60).padStart(2, "0")}
              </span>
            )}
          </>
        )}
      </div>
      {item.media?.isDemo && <p className="meta">{t.site.reference}</p>}
    </>
  );
}
export function ContentCard({
  item,
  locale,
}: {
  item: ContentRecord;
  locale: Locale;
}) {
  return (
    <article className="content-card">
      {/* Native navigation also works while a streamed page is hydrating. */}
      <a href={contentHref(item, locale)}>
        <MediaView
          item={item}
          locale={locale}
          painting={item.kind === "PAINTING" || item.kind === "PRODUCT"}
          showSummary
          summaryLink
        />
        <h3>{text(item, locale)}</h3>
      </a>
      <p className="meta">
        {item.category
          ? text(item.category, locale)
          : item.kind === "POST"
            ? locale === "en"
              ? "From the collection"
              : "Góc làng tranh"
            : ""}
        {item.kind === "VIDEO" && item.publishedAt
          ? " · " +
            new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            }).format(item.publishedAt)
          : ""}
      </p>
    </article>
  );
}
