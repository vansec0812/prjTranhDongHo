import Link from "next/link";
import { notFound } from "next/navigation";
import {
  contents,
  getSettings,
  isLocale,
  text,
  summary,
  localHref,
} from "@/lib/content";
import { publicSessions } from "@/lib/sessions";
import { Hero } from "@/components/hero";
import { SessionCard } from "@/components/session-card";
import { ContentCard } from "@/components/content-card";
import { TextLink, Wave, Empty } from "@/components/ui";
import { vi, en } from "@/i18n/messages";
import type { Metadata } from "next";
import { TourPreview } from "@/components/tour-preview";
import { contentHref } from "@/lib/content";
import { mediaUrl } from "@/lib/media-url";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const url = process.env.SITE_URL ?? "http://127.0.0.1:3000";
  return {
    title:
      locale === "en"
        ? "Dong Ho • Folk woodblock prints"
        : "Tranh Đông Hồ • Năm màu từ đất trời",
    description:
      locale === "en"
        ? "The craft of Dong Ho woodblock printing, paintings and hands-on workshops."
        : "Câu chuyện giấy dó, màu tự nhiên, nghề in ván và workshop trải nghiệm.",
    metadataBase: new URL(url),
    alternates: {
      canonical: locale === "en" ? "/en" : "/",
      languages: { vi: "/", en: "/en" },
    },
    robots:
      process.env.APP_MODE === "prototype"
        ? { index: false, follow: false }
        : undefined,
  };
}
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [heroes, paintings, videos, posts, artisans, sessions, settings] =
    await Promise.all([
      contents("HERO"),
      contents("PAINTING"),
      contents("VIDEO"),
      contents("POST"),
      contents("ARTISAN"),
      publicSessions(),
      getSettings(),
    ]);
  const t = (locale === "en" ? en : vi).site;
  const open = sessions.filter((s) => s.status === "OPEN");
  return (
    <>
      <Hero
        locale={locale}
        slides={heroes.slice(0, 3).map((h) => ({
          title: text(h, locale),
          titleLang: locale === "en" && !h.titleEn ? "vi" : locale,
          summary: summary(h, locale),
          summaryLang: locale === "en" && !h.summaryEn ? "vi" : locale,
          ctaUrl: h.hero?.ctaUrl ?? "/workshop",
          ctaLabel:
            locale === "en"
              ? (h.hero?.ctaLabelEn ?? t.reserve)
              : (h.hero?.ctaLabelVi ?? t.reserve),
        }))}
        frames={(settings.heroPaintingIds.length
          ? settings.heroPaintingIds
              .map((id) => paintings.find((p) => p.id === id))
              .filter((p) => p !== undefined)
          : paintings.slice(0, 3)
        ).flatMap((p) =>
          p.media
            ? [
                {
                  src: mediaUrl(p.media),
                  alt:
                    locale === "en"
                      ? p.media.altEn.trim() || p.media.altVi
                      : p.media.altVi,
                  width: p.media.width ?? 300,
                  height: p.media.height ?? 400,
                  isDemo: p.media.isDemo,
                  href: contentHref(p, locale),
                  summary: summary(p, locale),
                },
              ]
            : [],
        )}
        next={
          open[0]
            ? (locale === "en" ? open[0].labelEn : open[0].labelVi) +
              ` · ${open[0].available} ${locale === "en" ? "seats" : "chỗ"}`
            : undefined
        }
      />
      {settings.stats.length > 0 && (
        <section
          className="stats-band"
          aria-label={
            locale === "en" ? "Explore the collection" : "Khám phá bộ sưu tập"
          }
        >
          <div
            className="container stats-grid"
            data-count={settings.stats.length}
          >
            {settings.stats.map((s) => (
              <div className="stat" key={s.labelVi}>
                <strong>{s.value}</strong>
                <span>{locale === "en" ? s.labelEn : s.labelVi}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <TourPreview locale={locale} />
      <section className="container section">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              {locale === "en" ? "MAKE YOUR OWN PRINT" : "TỰ TAY IN TRANH"}
            </p>
            <h2>
              {locale === "en" ? "Upcoming workshops" : "Workshop sắp diễn ra"}
            </h2>
          </div>
          <TextLink href={localHref(locale, "/workshop")}>
            {t.viewSchedule}
          </TextLink>
        </div>
        {open.length ? (
          <div className="grid-3">
            {open.slice(0, 3).map((s) => (
              <SessionCard key={s.id} session={s} locale={locale} />
            ))}
          </div>
        ) : (
          <Empty>{t.noData}</Empty>
        )}
      </section>
      <div className="container">
        <Wave />
      </div>
      {videos.length > 0 && (
        <section className="container section">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                {locale === "en"
                  ? "STORIES FROM THE STUDIO"
                  : "XEM TRONG XƯỞNG"}
              </p>
              <h2>{locale === "en" ? "The latest videos" : "Video mới"}</h2>
            </div>
            <TextLink href={localHref(locale, "/video")}>{t.all}</TextLink>
          </div>
          <div className="grid-4">
            {videos.slice(0, 4).map((item) => (
              <ContentCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        </section>
      )}
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                {locale === "en"
                  ? "A PICTURE, A STORY"
                  : "MỖI BỨC TRANH, MỘT CÂU CHUYỆN"}
              </p>
              <h2>
                {locale === "en"
                  ? "In the painting collection"
                  : "Tranh trong thư viện"}
              </h2>
            </div>
            <TextLink href={localHref(locale, "/thu-vien-tranh")}>
              {t.gallery}
            </TextLink>
          </div>
          <div className="grid-3">
            {paintings.slice(0, 6).map((item) => (
              <ContentCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              {locale === "en"
                ? "A VILLAGE STILL PRINTING"
                : "CHUYỆN TỪ LÀNG TRANH"}
            </p>
            <h2>{t.posts}</h2>
          </div>
          <TextLink href={localHref(locale, "/tin-tuc")}>{t.all}</TextLink>
        </div>
        <div className="grid-3">
          {posts.slice(0, 3).map((item) => (
            <ContentCard key={item.id} item={item} locale={locale} />
          ))}
        </div>
      </section>
      <div className="container">
        <Wave />
      </div>
      <section className="container section grid-2">
        <div>
          <p className="eyebrow">{t.artisan}</p>
          <h2>
            {locale === "en"
              ? "The people behind the prints"
              : "Người giữ nét khắc"}
          </h2>
          {settings.quoteVi ? (
            <blockquote>
              {locale === "en"
                ? settings.quoteEn || settings.quoteVi
                : settings.quoteVi}
              <cite>{settings.quoteArtisan}</cite>
            </blockquote>
          ) : (
            <p>{artisans[0] ? summary(artisans[0], locale) : t.noData}</p>
          )}
          <TextLink href={localHref(locale, "/nghe-nhan")}>
            {t.artisan}
          </TextLink>
        </div>
        <div className="panel">
          <p className="eyebrow">{t.visit}</p>
          <h3>
            {locale === "en"
              ? "A day in Dong Ho village"
              : "Một ngày ghé làng Đông Hồ"}
          </h3>
          <p>{locale === "en" ? settings.addressEn : settings.addressVi}</p>
          <p className="small">
            {locale === "en" ? settings.hoursEn : settings.hoursVi}
          </p>
          <Link className="button" href={localHref(locale, "/tham-quan")}>
            {locale === "en" ? "Plan your visit" : "Xem hướng dẫn đường đi"}
          </Link>
        </div>
      </section>
    </>
  );
}
