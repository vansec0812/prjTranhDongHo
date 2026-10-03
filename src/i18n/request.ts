import { getRequestConfig } from "next-intl/server";
import { vi, en } from "./messages";
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) === "en" ? "en" : "vi";
  return { locale, messages: locale === "en" ? en : vi };
});
