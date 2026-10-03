import { NextRequest, NextResponse } from "next/server";
export default function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const locale = /^\/en(?:\/|$)/.test(path) ? "en" : "vi";
  const headers = new Headers(request.headers);
  headers.set("x-next-intl-locale", locale);
  headers.set("x-public-path", path);
  // Keep the internal /vi rewrite stable on Next 15; prefix removal during rewrite
  // re-entry would redirect / back to itself. Public links/canonicals remain unprefixed.
  if (/^\/(en|vi)(?:\/|$)/.test(path))
    return NextResponse.next({ request: { headers } });
  return NextResponse.rewrite(
    new URL(
      `/vi${path === "/" ? "" : path}${request.nextUrl.search}`,
      request.url,
    ),
    { request: { headers } },
  );
}
export const config = { matcher: ["/((?!api|admin|dev|_next|.*\\..*).*)"] };
