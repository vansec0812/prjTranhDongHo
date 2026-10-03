export type Locale = "vi" | "en";
export function localHref(locale: Locale, path: string) {
  path = path.replace(
    /^\/(tham-quan-360|virtual-tour)(?=[?#]|$)/,
    locale === "en" ? "/virtual-tour" : "/tham-quan-360",
  );
  return locale === "en" ? `/en${path === "/" ? "" : path}` : path;
}
