import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const results = [];
let errors = [];
page.on("pageerror", (error) => errors.push(error.message));
for (let index = 0; index < 30; index++) {
  errors = [];
  const route = ["/thu-vien-tranh", "/en/thu-vien-tranh", "/", "/en"][
    index % 4
  ];
  const response = await page.goto("http://127.0.0.1:3000" + route, {
    waitUntil: "load",
  });
  await page.evaluate(() => document.fonts.ready);
  // Exercise a hydrated handler, then allow the streamed page's remaining work to settle.
  const open = page.locator(".site-header button.mobile-only");
  await open.click();
  await page.getByRole("dialog").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  results.push({
    index,
    route,
    status: response.status(),
    h1: await page.locator("h1").count(),
    errors: [...errors],
  });
}
await browser.close();
await fs.writeFile(
  "docs/qa/source-update/hydration.json",
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      instrumentation: "None; unmodified served browser chunks",
      commit: null,
      results,
    },
    null,
    2,
  ),
);
const failed = results.filter(
  (result) => result.status !== 200 || result.h1 !== 1 || result.errors.length,
);
console.log(JSON.stringify({ requests: results.length, failed }));
if (failed.length) process.exitCode = 1;
