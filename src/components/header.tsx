"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Menu, X, Search } from "lucide-react";
import { Seal } from "./ui";
import { localHref, type Locale } from "@/lib/links";
export const nav = [
  ["home", "/"],
  ["history", "/lich-su"],
  ["gallery", "/thu-vien-tranh"],
  ["video", "/video"],
  ["tour", "/tham-quan-360"],
  ["workshop", "/workshop"],
  ["artisan", "/nghe-nhan"],
  ["contact", "/lien-he"],
] as const;
export function Brand({
  admin = false,
  locale = "vi",
}: {
  admin?: boolean;
  locale?: Locale;
}) {
  return (
    <Link href={admin ? "/admin" : localHref(locale, "/")} className="brand">
      <Seal />
      <span>
        <span className="brand-title">
          {admin ? "Quản trị" : "Tranh Đông Hồ"}
        </span>
        <br />
        <span className="brand-sub">
          {admin ? "Văn hóa tranh Đông Hồ" : "XƯỞNG TRANH DÂN GIAN"}
        </span>
      </span>
    </Link>
  );
}
export function LanguageLinks({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const path = pathname.replace(/^\/(en|vi)(?=\/|$)/, "") || "/";
  return (
    <div className="language" aria-label="Language">
      <a
        href={localHref("vi", path)}
        lang="vi"
        aria-current={locale === "vi" ? "true" : undefined}
        onClick={(e) => {
          e.currentTarget.href =
            localHref("vi", path) +
            window.location.search +
            window.location.hash;
        }}
      >
        VI
      </a>
      <a
        href={localHref("en", path)}
        lang="en"
        aria-current={locale === "en" ? "true" : undefined}
        onClick={(e) => {
          e.currentTarget.href =
            localHref("en", path) +
            window.location.search +
            window.location.hash;
        }}
      >
        EN
      </a>
    </div>
  );
}
export function Header({
  locale,
  hours,
  address,
}: {
  locale: Locale;
  hours: string;
  address: string;
}) {
  const t = useTranslations("site");
  const path = usePathname().replace(/^\/vi(?=\/|$)/, "") || "/";
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const active = (href: string) =>
    path === localHref(locale, href) ||
    (href !== "/" && path.startsWith(localHref(locale, href) + "/"));
  return (
    <>
      <div className="topbar">
        <div className="container flex spread">
          <span>
            {hours} · {address}
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="container nav-row">
          <Brand locale={locale} />
          <nav
            className="desktop-nav"
            aria-label={
              locale === "en" ? "Main navigation" : "Điều hướng chính"
            }
          >
            {nav.map(([key, href]) => (
              <Link
                key={key}
                href={localHref(locale, href)}
                className={`nav-link${active(href) ? " active" : ""}`}
                aria-current={active(href) ? "page" : undefined}
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <Link
            href={localHref(locale, "/tim-kiem")}
            className="icon-button"
            aria-label={t("search")}
          >
            <Search size={20} />
          </Link>
          <LanguageLinks locale={locale} />
          <button
            ref={opener}
            className="icon-button mobile-only"
            aria-label={t("menu")}
            onClick={() => dialog.current?.showModal()}
          >
            <Menu size={24} />
          </button>
        </div>
      </header>
      <dialog
        ref={dialog}
        className="dialog-menu"
        aria-label={t("menu")}
        onClose={() => opener.current?.focus()}
      >
        <div className="flex spread">
          <Brand locale={locale} />
          <button
            className="icon-button"
            aria-label={t("close")}
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        <nav>
          {[
            ...nav,
            ["posts", "/tin-tuc"],
            ["visit", "/tham-quan"],
            ["faq", "/hoi-dap"],
          ].map(([key, href]) => (
            <Link
              key={key}
              href={localHref(locale, href)}
              className={active(href) ? "active" : ""}
              onClick={() => dialog.current?.close()}
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="flex spread">
          <LanguageLinks locale={locale} />
          <span className="small">{hours}</span>
        </div>
      </dialog>
    </>
  );
}
