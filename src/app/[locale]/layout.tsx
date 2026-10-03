import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import { CookiePreference } from "@/components/cookie-preference";
import { validatePublicRoute } from "@/lib/public-route";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FontPreload } from "@/components/font-preload";
import { getSettings, isLocale } from "@/lib/content";
import "@/styles/globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://127.0.0.1:3000"),
};
export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await validatePublicRoute(
    (await headers()).get("x-public-path") ?? "/",
    locale,
  );
  const settings = await getSettings();
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "site" });
  return (
    <html lang={locale}>
      <head>
        <FontPreload />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <a className="skip-link" href="#main">
            {t("skip")}
          </a>
          <Header
            locale={locale}
            hours={locale === "en" ? settings.hoursEn : settings.hoursVi}
            address={locale === "en" ? settings.addressEn : settings.addressVi}
          />
          <main id="main">
            <Suspense
              fallback={
                <div className="page-loading" role="status">
                  <p>{t("loading")}</p>
                </div>
              }
            >
              {children}
            </Suspense>
          </main>
          <CookiePreference
            locale={locale}
            initial={(await cookies()).get("dh-analytics-consent")?.value}
          />
          <Footer locale={locale} settings={settings} />
          {settings.zalo && (
            <a
              className="contact-quick"
              href={settings.zalo}
              target="_blank"
              rel="noreferrer"
            >
              Zalo
            </a>
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
