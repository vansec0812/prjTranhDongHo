import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 1000 } });
const route = process.argv[2] ?? "/";
if (route.startsWith("/admin")) {
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
}
await page.goto("http://127.0.0.1:3000" + route);
await page.locator("h1").waitFor();
await page.evaluate(() => document.fonts.ready);
console.log(
  await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .map((el) => ({
        tag: el.tagName,
        cls: el.className,
        left: el.getBoundingClientRect().left,
        right: el.getBoundingClientRect().right,
        text: el.textContent?.slice(0, 80),
      }))
      .filter((el) => el.right > innerWidth + 1 && el.left >= 0),
  ),
);
await browser.close();
