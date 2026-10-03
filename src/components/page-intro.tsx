"use client";
import Link from "next/link";
import { localHref, type Locale } from "@/lib/links";
import { en, vi } from "@/i18n/messages";

// A component fiber owns this subtree before resolving its children. This avoids
// replaying a claimed host div against its own child during Flight hydration.
export function Intro({
  locale,
  title,
  description,
  section,
}: {
  locale: Locale;
  title: string;
  description?: string;
  section: string;
}) {
  const t = (locale === "en" ? en : vi).site;
  return (
    <div className="page-intro">
      <nav className="breadcrumb" aria-label={t.bread}>
        <Link href={localHref(locale, "/")}>{t.home}</Link>
        <span aria-hidden="true">/</span>
        <span>{title}</span>
      </nav>
      <p className="eyebrow">{section}</p>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
