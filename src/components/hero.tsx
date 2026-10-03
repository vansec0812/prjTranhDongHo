"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { ButtonLink } from "./ui";
import type { Locale } from "@/lib/links";
import { localHref } from "@/lib/links";
import { en, vi } from "@/i18n/messages";
type Slide = {
  title: string;
  summary: string;
  ctaUrl: string;
  ctaLabel: string;
  titleLang: Locale;
  summaryLang: Locale;
};
export function Hero({
  slides,
  locale,
  next,
  frames,
}: {
  slides: Slide[];
  locale: Locale;
  next?: string;
  frames: Array<{
    src: string;
    alt: string;
    width: number;
    height: number;
    isDemo: boolean;
    href: string;
    summary: string;
  }>;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = (locale === "en" ? en : vi).site;
  useEffect(() => {
    if (
      slides.length <= 1 ||
      paused ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      7000,
    );
    return () => clearInterval(timer);
  }, [paused, slides.length]);
  const slide = slides[index];
  if (!slide) return null;
  const title = slide.title.split(locale === "en" ? "from nature" : "đất trời");
  return (
    <section className="container hero">
      <div className="hero-copy">
        <p className="eyebrow">
          {locale === "en"
            ? "FOLK WOODBLOCK PRINTS · DONG HO VILLAGE"
            : "TRANH KHẮC GỖ DÂN GIAN · LÀNG ĐÔNG HỒ"}
        </p>
        <h1 lang={slide.titleLang}>
          {title[0]}
          {title.length > 1 && (
            <>
              <em>{locale === "en" ? "from nature" : "đất trời"}</em>
              {title[1]}
            </>
          )}
        </h1>
        <p lang={slide.summaryLang}>{slide.summary}</p>
        {locale === "en" &&
          (slide.titleLang === "vi" || slide.summaryLang === "vi") && (
            <p className="meta">{t.fallback}</p>
          )}
        <div className="hero-actions">
          <ButtonLink href={localHref(locale, slide.ctaUrl)}>
            {slide.ctaLabel}
            <ArrowRight size={18} aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href={localHref(locale, "/lich-su")} secondary>
            {t.story}
          </ButtonLink>
        </div>
        {next && (
          <p className="hero-next">
            {locale === "en" ? "Next class: " : "Buổi sắp tới: "}
            {next}
          </p>
        )}
        {slides.length > 1 && (
          <div className="flex">
            <button
              className="icon-button"
              onClick={() =>
                setIndex((i) => (i - 1 + slides.length) % slides.length)
              }
              aria-label={locale === "en" ? "Previous slide" : "Slide trước"}
            >
              <ChevronLeft />
            </button>
            <span className="meta">
              {index + 1}/{slides.length}
            </span>
            <button
              className="icon-button"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
              aria-label={locale === "en" ? "Next slide" : "Slide tiếp"}
            >
              <ChevronRight />
            </button>
            <button
              className="icon-button"
              onClick={() => setPaused(!paused)}
              aria-label={
                paused
                  ? locale === "en"
                    ? "Resume slideshow"
                    : "Tiếp tục trình chiếu"
                  : locale === "en"
                    ? "Pause slideshow"
                    : "Dừng trình chiếu"
              }
            >
              {paused ? <Play /> : <Pause />}
            </button>
          </div>
        )}
      </div>
      <div className="hero-art">
        {frames.map((frame, i) => (
          <Link href={frame.href} className="frame" key={`${frame.src}-${i}`}>
            <Image
              src={frame.src}
              alt={frame.alt}
              width={frame.width}
              height={frame.height}
              sizes="(max-width:767px) 45vw, 24vw"
              priority
              unoptimized={frame.src.startsWith("/demo/")}
            />
            <span className="image-summary">
              {frame.summary}
              <span className="summary-action">{t.more} →</span>
            </span>
          </Link>
        ))}
        <div className="hero-stamp" aria-hidden="true">
          {locale === "en"
            ? "One block for each colour"
            : "Một ván khắc cho mỗi lớp màu"}
        </div>
        {frames.some((f) => f.isDemo) && (
          <span className="art-label">{t.reference}</span>
        )}
      </div>
    </section>
  );
}
