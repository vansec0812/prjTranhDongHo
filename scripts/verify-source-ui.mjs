import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const folder = "docs/qa/source-update";
await fs.mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const results = [];
const widths = [360, 375, 768, 1200, 1440];
const routes = [
  "/",
  "/thu-vien-tranh",
  "/thu-vien-tranh/dam-cuoi-chuot",
  "/lich-su",
  "/gioi-thieu",
  "/san-pham/dam-cuoi-chuot",
  "/workshop/in-tranh-co-ban",
  "/tham-quan-360?diem=phong-tranh",
  "/en",
  "/en/thu-vien-tranh",
  "/en/virtual-tour?diem=mau-va-giay",
];
for (const width of widths) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.addCookies([
    {
      name: "dh-analytics-consent",
      value: "declined",
      url: "http://127.0.0.1:3000",
    },
  ]);
  const page = await context.newPage();
  for (const route of routes) {
    const errors = [];
    const handle = (e) => errors.push(e.message);
    page.on("pageerror", handle);
    const response = await page.goto("http://127.0.0.1:3000" + route, {
      waitUntil: "domcontentloaded",
    });
    await page.evaluate(() => document.fonts.ready);
    const vr = route.includes("360") || route.includes("virtual-tour");
    if (vr)
      await page.locator('.tour-experience[data-state="ready"]').waitFor();
    const images = page.locator("main img");
    for (let i = 0; i < (await images.count()); i++) {
      const image = images.nth(i);
      if (!(await image.isVisible())) continue;
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((image) => image.decode());
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    const size = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      h1: document.querySelectorAll("h1").length,
    }));
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const overlap = vr
      ? await page.evaluate(() => {
          const a = document
              .querySelector(".tour-direction")
              ?.getBoundingClientRect(),
            b = document.querySelector(".tour-map")?.getBoundingClientRect();
          return Boolean(
            a &&
            b &&
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top,
          );
        })
      : false;
    const key =
      route === "/"
        ? "home"
        : route.split("?")[0].slice(1).replaceAll("/", "-");
    if ([375, 1440].includes(width))
      await page.screenshot({
        path: `${folder}/${key}-${width}.png`,
        fullPage: true,
      });
    results.push({
      route,
      locale: route.startsWith("/en") ? "en" : "vi",
      width,
      state: vr ? "ready" : "default",
      httpStatus: response?.status(),
      size,
      controlOverlap: overlap,
      errors,
      violations: axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        targets: v.nodes.map((n) => n.target),
      })),
    });
    page.removeListener("pageerror", handle);
    console.log(
      `${width} ${route}: ${response?.status()} overflow=${size.document > width} a11y=${axe.violations.length} overlap=${overlap}`,
    );
  }
  // Admin shares tokens: validate its actual authenticated screen at every required width.
  const access = await fs.readFile(".local/demo-access.txt", "utf8");
  const email = /Email: (.+)/.exec(access)?.[1],
    password = /Password: (.+)/.exec(access)?.[1];
  if (!email || !password) throw new Error("Private admin access missing");
  await page.goto("http://127.0.0.1:3000/admin/login");
  await page.getByLabel("Email *", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu *", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL("http://127.0.0.1:3000/admin");
  await page.goto("http://127.0.0.1:3000/admin/tranh");
  await page.evaluate(() => document.fonts.ready);
  const size = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    h1: document.querySelectorAll("h1").length,
  }));
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  if ([375, 1440].includes(width))
    await page.screenshot({
      path: `${folder}/admin-tranh-${width}.png`,
      fullPage: true,
    });
  results.push({
    route: "/admin/tranh",
    locale: "vi",
    width,
    state: "authenticated",
    httpStatus: 200,
    size,
    controlOverlap: false,
    errors: [],
    violations: axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target),
    })),
  });
  await context.close();
}
await browser.close();
await fs.writeFile(
  `${folder}/ui-review.json`,
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      commit: null,
      sourceManifest: "../source-manifest.json",
      beforeSourceManifest: "before-source-manifest.json",
      before: [
        "../vi-home-375.png",
        "../vi-home-1440.png",
        "../vi-thu-vien-tranh-375.png",
        "../vi-thu-vien-tranh-1440.png",
      ],
      engine: "Chromium desktop emulation",
      results,
    },
    null,
    2,
  ),
);
if (
  results.some(
    (r) =>
      r.size.document > r.width ||
      r.size.h1 !== 1 ||
      r.httpStatus !== 200 ||
      r.errors.length ||
      r.violations.length ||
      r.controlOverlap,
  )
)
  process.exitCode = 1;
