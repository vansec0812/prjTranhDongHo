import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const phase = process.argv[2] ?? "after";
if (!["before", "after"].includes(phase))
  throw new Error("Use before or after");
const folder = "docs/qa/vercel-prototype";
await fs.mkdir(folder, { recursive: true });
const access = await fs.readFile(".local/demo-access.txt", "utf8");
const email = /Email: (.+)/.exec(access)?.[1]?.trim();
const password = /Password: (.+)/.exec(access)?.[1]?.trim();
if (!email || !password)
  throw new Error("Private local test access unavailable");
const browser = await chromium.launch();
const results = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const authPage = await context.newPage();
let authenticated = false;
try {
  for (const width of [360, 375, 768, 1200, 1440]) {
    const routes = [
      "/admin/login",
      "/admin/quen-mat-khau",
      "/",
      "/en",
      "/lien-he",
      "/en/lien-he",
      "/admin/tranh",
      "/admin/tranh/moi",
      "/admin/email",
    ];
    for (const route of routes) {
      if (
        route.startsWith("/admin/") &&
        !["/admin/login", "/admin/quen-mat-khau"].includes(route) &&
        !authenticated
      ) {
        await authPage.goto("http://127.0.0.1:3000/admin/login");
        await authPage.getByLabel("Email *", { exact: true }).fill(email);
        await authPage.getByLabel("Mật khẩu *", { exact: true }).fill(password);
        await authPage
          .getByRole("button", { name: "Đăng nhập", exact: true })
          .click();
        await authPage.waitForURL("http://127.0.0.1:3000/admin");
        await authPage.waitForLoadState("networkidle");
        authenticated = true;
        await authPage.close();
      }
      // Independent documents prevent development hot-refresh callbacks from
      // the previous page racing a full navigation. Data, fonts and clock stay
      // fixed; no retries, masking or timeout increases hide rendering errors.
      const page = await context.newPage();
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(new Date("2026-10-04T00:00:00+07:00"));
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto("http://127.0.0.1:3000" + route, {
        waitUntil: "domcontentloaded",
      });
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        h1: document.querySelectorAll("h1").length,
      }));
      const a11y = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      let screenshot;
      if ([375, 1440].includes(width)) {
        screenshot = `${phase}-${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}-${width}.png`;
        await page.screenshot({
          path: `${folder}/${screenshot}`,
          fullPage: true,
        });
      }
      results.push({
        phase,
        route,
        width,
        locale: route.startsWith("/en") ? "en" : "vi",
        state: "default",
        status: response.status(),
        dimensions,
        errors: [...errors],
        violations: a11y.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          targets: v.nodes.map((n) => n.target),
        })),
        screenshot,
      });
      await page.close();
    }
    console.log(
      `UI ${phase}: ${width}px captured; private credentials excluded.`,
    );
  }
} finally {
  await context.close();
  await browser.close();
}
await fs.writeFile(
  `${folder}/${phase}.json`,
  JSON.stringify(
    {
      baseCommit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      workingTree: true,
      clock: "2026-10-04T00:00:00+07:00",
      profile:
        "Local database/provider adapters; visual evidence only, not a cloud integration test",
      results,
    },
    null,
    2,
  ),
);
const failures = results.filter(
  (r) =>
    r.status !== 200 ||
    r.dimensions.document > r.width ||
    r.dimensions.h1 !== 1 ||
    r.errors.length ||
    r.violations.length,
);
console.log(
  JSON.stringify({
    phase,
    pages: results.length,
    failures: failures.map((r) => ({
      route: r.route,
      width: r.width,
      status: r.status,
      overflow: r.dimensions.document - r.width,
      errors: r.errors,
      violations: r.violations,
    })),
  }),
);
if (failures.length) process.exitCode = 1;
