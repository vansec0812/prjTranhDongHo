import fs from "node:fs";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
fs.mkdirSync("docs/qa", { recursive: true });
const browser = await chromium.launch();
const findings = [];
for (const width of [360, 375, 768, 1200, 1440]) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "Đi một vòng, gặp Đông Hồ." })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    height: document.documentElement.scrollHeight,
    h1: document.querySelector("h1")?.textContent,
  }));
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  if ([375, 1440].includes(width))
    await page.screenshot({
      path: `docs/qa/home-after-${width}.png`,
      fullPage: true,
    });
  findings.push({
    route: "/",
    width,
    locale: "vi",
    dimensions,
    errors,
    violations: axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target),
    })),
  });
  await context.close();
}
fs.writeFileSync(
  "docs/qa/ui-first-review.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
await browser.close();
if (
  findings.some(
    (f) =>
      f.dimensions.document > f.width || f.errors.length || f.violations.length,
  )
)
  process.exitCode = 1;
