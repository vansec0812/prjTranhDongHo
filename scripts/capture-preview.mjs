import fs from "node:fs";
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
for (const width of [375, 1440]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("http://127.0.0.1:3000/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `docs/qa/home-viewport-${width}.png` });
}
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
for (const width of [375, 1440]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("http://127.0.0.1:3000/admin");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `docs/qa/admin-viewport-${width}.png` });
}
await browser.close();
