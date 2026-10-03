import fs from "node:fs";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const browser = await chromium.launch();
const results = [];
const publicRoutes = [
  "/",
  "/gioi-thieu",
  "/lich-su",
  "/thu-vien-tranh",
  "/thu-vien-tranh/ca-minh-hoa",
  "/video",
  "/video/cho-tranh-tet",
  "/workshop",
  "/workshop/in-tranh-co-ban",
  "/workshop/tra-cuu",
  "/nghe-nhan",
  "/nghe-nhan/ho-so-mau",
  "/san-pham",
  "/tin-tuc",
  "/tin-tuc/giay-diep",
  "/tham-quan",
  "/hoi-dap",
  "/lien-he",
  "/tim-kiem?q=ca",
  "/chinh-sach-bao-mat",
  "/dieu-khoan",
];
const workshopOnly = process.argv.includes("--workshop-only");
if (workshopOnly)
  publicRoutes.splice(0, publicRoutes.length, "/workshop/in-tranh-co-ban");
for (const locale of ["vi", "en"]) {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of publicRoutes) {
    for (const width of [360, 375, 768, 1200, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const url = (locale === "en" ? "/en" : "") + (route === "/" ? "" : route);
      const response = await page.goto("http://127.0.0.1:3000" + url, {
        waitUntil: "domcontentloaded",
      });
      await page.locator("main h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      const d = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        h1: document.querySelectorAll("h1").length,
      }));
      const violations = [375, 1440].includes(width)
        ? (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          }))
        : [];
      if (
        [375, 1440].includes(width) &&
        [
          "/",
          "/workshop/in-tranh-co-ban",
          "/lich-su",
          "/thu-vien-tranh",
          "/lien-he",
        ].includes(route)
      )
        await page.screenshot({
          path: `docs/qa/${locale}-${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}-${width}.png`,
          fullPage: true,
        });
      results.push({
        route: url || "/",
        locale,
        width,
        status: response.status(),
        ...d,
        violations,
        errors: [...errors],
      });
      errors.length = 0;
      if (d.scroll > d.width || violations.length || response.status() !== 200)
        console.log(JSON.stringify(results.at(-1)));
    }
  }
  await context.close();
}
if (workshopOnly) {
  fs.writeFileSync(
    "docs/qa/workshop-final-review.json",
    JSON.stringify(results, null, 2),
  );
  await browser.close();
  const failed = results.some(
    (r) =>
      r.scroll > r.width ||
      r.h1 !== 1 ||
      r.status !== 200 ||
      r.violations.length ||
      r.errors?.length,
  );
  console.log(
    `Reviewed ${results.length} workshop locale/viewport states; failed=${failed}`,
  );
  process.exit(failed ? 1 : 0);
}
const context = await browser.newContext();
const page = await context.newPage();
const access = fs.readFileSync(".local/demo-access.txt", "utf8");
await page.goto("http://127.0.0.1:3000/admin/login");
await page
  .getByLabel("Email *", { exact: true })
  .fill(/Email: (.+)/.exec(access)[1]);
await page
  .getByLabel("Mật khẩu *", { exact: true })
  .fill(/Password: (.+)/.exec(access)[1]);
await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
await page.waitForURL("**/admin");
for (const route of [
  "/admin",
  "/admin/tranh",
  "/admin/tranh/moi",
  "/admin/workshop",
  "/admin/dang-ky",
  "/admin/hop-thu",
  "/admin/media",
  "/admin/cau-hinh",
  "/admin/tai-khoan",
  "/admin/email",
])
  for (const width of [360, 375, 768, 1200, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto("http://127.0.0.1:3000" + route);
    await page.locator("h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const d = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      h1: document.querySelectorAll("h1").length,
    }));
    const violations = [375, 1440].includes(width)
      ? (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        }))
      : [];
    if (
      [375, 1440].includes(width) &&
      ["/admin", "/admin/tranh/moi"].includes(route)
    )
      await page.screenshot({
        path: `docs/qa/${route.slice(1).replaceAll("/", "-")}-${width}.png`,
        fullPage: true,
      });
    results.push({
      route,
      locale: "vi",
      width,
      status: response.status(),
      ...d,
      violations,
    });
    if (d.scroll > d.width || violations.length || response.status() !== 200)
      console.log(JSON.stringify(results.at(-1)));
  }
fs.writeFileSync("docs/qa/route-review.json", JSON.stringify(results, null, 2));
console.log(`Reviewed ${results.length} route/viewport states`);
await browser.close();
if (
  results.some(
    (r) =>
      r.scroll > r.width ||
      r.h1 !== 1 ||
      r.status !== 200 ||
      r.violations.length ||
      r.errors?.length,
  )
)
  process.exitCode = 1;
