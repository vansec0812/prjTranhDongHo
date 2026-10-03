import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.log(m.text().slice(0, 250));
});
page.on("pageerror", (e) => console.log(e.message));
page.on("requestfailed", (r) =>
  console.log("Failed request", new URL(r.url()).hostname, r.failure()),
);
const booking = process.argv.includes("--booking");
if (booking) {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("http://127.0.0.1:3000/workshop/in-tranh-co-ban");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByLabel("Họ và tên *").fill("Khách demo");
  await page.getByLabel("Số điện thoại *").fill("+12025550188");
  await page.getByLabel("Email *", { exact: true }).fill("x@example.invalid");
  await page.locator("#dang-ky input[name=consent]").check();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
} else {
  await page.goto("http://127.0.0.1:3000/lien-he");
  await page
    .getByRole("button", { name: "Gửi lời nhắn", exact: true })
    .scrollIntoViewIfNeeded();
}
for (let i = 0; i < 12; i++) {
  console.log(
    await page.evaluate(() => ({
      scroll: scrollY,
      turnstile: typeof window.turnstile,
      scripts: [...document.scripts]
        .map((s) => s.src)
        .filter((s) => s.includes("cloudflare")),
      loading: [...document.querySelectorAll(".meta")]
        .filter((el) => el.textContent.includes("chống spam"))
        .map((el) => ({
          text: el.textContent,
          top: el.getBoundingClientRect().top,
        })),
      iframes: [...document.querySelectorAll("iframe")].map((el) => ({
        src: el.src.slice(0, 120),
        top: el.getBoundingClientRect().top,
      })),
      disabled: document.querySelector(
        "#dang-ky button[type=submit],form:has(#contact-name) button[type=submit],form:has(#contact-name) button:not([type])",
      )?.disabled,
    })),
  );
  await new Promise((r) => setTimeout(r, 1000));
}
await browser.close();
