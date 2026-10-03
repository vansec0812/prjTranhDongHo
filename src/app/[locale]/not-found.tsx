import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations("site");
  return (
    <div className="container section stack">
      <p className="eyebrow">404</p>
      <h1>
        {locale === "en"
          ? "This page is not in the studio."
          : "Trang bạn tìm chưa có trong xưởng."}
      </h1>
      <Link className="button" href={locale === "en" ? "/en" : "/"}>
        {t("home")}
      </Link>
      <Link
        className="text-link"
        href={locale === "en" ? "/en/tim-kiem" : "/tim-kiem"}
      >
        {t("search")}
      </Link>
    </div>
  );
}
