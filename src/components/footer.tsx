import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/content";
import { localHref } from "@/lib/content";
import type { SiteSettings } from "@/lib/config";
import { Brand } from "./header";
import { Newsletter } from "./newsletter";
export async function Footer({
  locale,
  settings,
}: {
  locale: Locale;
  settings: SiteSettings;
}) {
  const t = await getTranslations({ locale, namespace: "site" });
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <p className="eyebrow">{t("newsletter")}</p>
            <h2>
              {locale === "en"
                ? "Keep in touch with the craft."
                : "Một lời hẹn với làng tranh."}
            </h2>
            <p>{t("newsletterText")}</p>
            <Newsletter locale={locale} />
          </div>
          <div className="stack">
            <Brand locale={locale} />
            <p className="small">
              {locale === "en" ? settings.addressEn : settings.addressVi}
              <br />
              {locale === "en" ? settings.hoursEn : settings.hoursVi}
            </p>
            {settings.phone && (
              <a href={`tel:${settings.phone}`}>{settings.phone}</a>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            )}
            <Link href={localHref(locale, "/tham-quan")}>{t("visit")}</Link>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.mapQuery)}`}
              target="_blank"
              rel="noreferrer"
            >
              {locale === "en" ? "Open location map" : "Mở bản đồ địa điểm"}
            </a>
            {settings.zalo && (
              <a href={settings.zalo} target="_blank" rel="noreferrer">
                Zalo
              </a>
            )}
            {settings.facebook && (
              <a href={settings.facebook} target="_blank" rel="noreferrer">
                Facebook
              </a>
            )}
            {settings.messenger && (
              <a href={settings.messenger} target="_blank" rel="noreferrer">
                Messenger
              </a>
            )}
          </div>
          <nav className="footer-links" aria-label="Footer">
            {[
              ["history", "/lich-su"],
              ["gallery", "/thu-vien-tranh"],
              ["tour", "/tham-quan-360"],
              ["products", "/san-pham"],
              ["workshop", "/workshop"],
              ["lookup", "/workshop/tra-cuu"],
              ["posts", "/tin-tuc"],
              ["faq", "/hoi-dap"],
              ["contact", "/lien-he"],
            ].map(([key, href]) => (
              <Link key={key} href={localHref(locale, href)}>
                {t(key)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="footer-bottom">
          <span>Văn hóa Tranh Đông Hồ · 2026</span>
          <div className="flex wrap">
            <Link href={localHref(locale, "/chinh-sach-bao-mat")}>
              {t("privacy")}
            </Link>
            <Link href={localHref(locale, "/dieu-khoan")}>{t("terms")}</Link>
            <Link href="/admin">{t("admin")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
