import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { z } from "zod";
test("NFR-06 · canonical và hreflang là URL tuyệt đối đúng route VI/EN", async ({
  page,
  baseURL,
}) => {
  for (const path of [
    "/workshop/in-tranh-co-ban",
    "/en/workshop/in-tranh-co-ban",
  ]) {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new URL(path, baseURL).href,
    );
    await expect(page.locator('link[hreflang="vi"]')).toHaveAttribute(
      "href",
      new URL("/workshop/in-tranh-co-ban", baseURL).href,
    );
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute(
      "href",
      new URL("/en/workshop/in-tranh-co-ban", baseURL).href,
    );
  }
});
test("FR-GEN-01/02 · tìm không dấu, lọc tranh và đổi ngôn ngữ giữ route", async ({
  page,
}) => {
  await page.goto("/tim-kiem?q=dam%20cuoi%20chuot");
  await expect(
    page.getByRole("heading", { name: "Tìm kiếm", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Đám cưới chuột" }),
  ).toBeVisible();
  await page.goto("/thu-vien-tranh?mau=vermilion");
  await expect(page.locator("h1")).toContainText("Thư viện tranh");
  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/thu-vien-tranh\?mau=vermilion/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
test("UI-20 · menu mobile giữ focus và Escape đóng", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Mở menu" });
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(opener).toBeFocused();
});
test("SEC-01 · Guest bị chặn API quản trị, upload và export", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/admin", { data: { action: "settings" } })
    ).status(),
  ).toBe(401);
  expect((await request.post("/api/admin/upload")).status()).toBe(401);
  expect(
    (await request.get("/api/admin/export?type=registrations")).status(),
  ).toBe(401);
});
test("FR-ADM-01/07 · đăng nhập thật, nội dung nháp không public", async ({
  page,
  request,
}) => {
  const access = fs.readFileSync(".local/demo-access.txt", "utf8");
  const email = /Email: (.+)/.exec(access)?.[1];
  const password = /Password: (.+)/.exec(access)?.[1];
  if (!email || !password) throw new Error("Private demo access missing");
  await page.goto("/admin/login");
  await page.getByLabel("Email *", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu *", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator("h1")).toContainText("Tổng quan");
  await page.goto("/admin/tranh/moi");
  await expect(page.getByLabel("Tiêu đề VI *")).toBeVisible();
  const slug = `e2e-nhap-${Date.now()}`;
  await page.getByLabel("Tiêu đề VI *").fill("Bản nháp kiểm thử E2E");
  await page.getByLabel("Đường dẫn *", { exact: true }).fill(slug);
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(
    page.getByText("Đã lưu nội dung vào cơ sở dữ liệu.", { exact: true }),
  ).toBeVisible();
  expect((await request.get(`/thu-vien-tranh/${slug}`)).status()).toBe(404);
  const search = await request.get(`/tim-kiem?q=${slug}`);
  expect(await search.text()).not.toContain("Bản nháp kiểm thử E2E");
  const exported = await page.request.get(
    "/api/admin/export?type=registrations&format=xlsx",
  );
  expect(exported.status()).toBe(200);
  expect(exported.headers()["content-type"]).toContain("spreadsheetml");
  expect((await request.get("/thu-vien-tranh/khong-ton-tai")).status()).toBe(
    404,
  );
});
test("FR-WS-03/05/06 · đăng ký mobile → mã DB → tra cứu → ICS → hủy", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/workshop/in-tranh-co-ban");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByLabel("Họ và tên *").fill("Khách kiểm thử demo");
  await page.getByLabel("Số điện thoại *").fill("+12025550188");
  await page
    .getByLabel("Email *", { exact: true })
    .fill(`e2e-${Date.now()}@example.invalid`);
  await page.locator("#dang-ky input[name=consent]").check();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  const send = page.getByRole("button", { name: "Gửi đăng ký", exact: true });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(
    page.getByRole("heading", { name: "Đã nhận đăng ký", exact: true }),
  ).toBeVisible();
  const code = await page
    .locator("h3")
    .filter({ hasText: /DH-\d{4}-[A-F0-9]{4}/ })
    .innerText();
  await page.goto("/workshop/tra-cuu");
  await page.getByLabel("Mã đăng ký *").fill(code);
  await page.getByLabel("Số điện thoại *").fill("+12025550188");
  await page
    .getByRole("button", { name: "Tra cứu đăng ký", exact: true })
    .click();
  await expect(
    page.getByText("Đã nhận đăng ký", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /lịch.*ics|Thêm vào lịch/i }).click();
  expect((await download).suggestedFilename()).toBe("workshop.ics");
  await page.getByRole("button", { name: "Hủy đăng ký", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByText("Đã hủy", { exact: true })).toBeVisible();
});
test("FR-ART-02/03 · liên hệ lưu hộp thư thật", async ({ page }) => {
  await page.goto("/lien-he");
  await page.getByLabel("Họ và tên *").fill("Khách kiểm thử liên hệ");
  await page
    .getByLabel("Email *", { exact: true })
    .fill(`contact-${Date.now()}@example.invalid`);
  await page.getByLabel("Số điện thoại *").fill("+12025550177");
  await page
    .getByLabel("Lời nhắn *")
    .fill("Tôi muốn tìm hiểu lịch trải nghiệm và các mẫu tranh tại xưởng.");
  await page.locator("form:has(#contact-name) input[name=consent]").check();
  const send = page.getByRole("button", { name: "Gửi lời nhắn", exact: true });
  await send.scrollIntoViewIfNeeded();
  await expect(send).toBeEnabled();
  await send.click();
  await expect(
    page.getByRole("heading", { name: "Đã nhận lời nhắn" }),
  ).toBeVisible();
  const access = fs.readFileSync(".local/demo-access.txt", "utf8");
  await page.goto("/admin/login");
  await page
    .getByLabel("Email *", { exact: true })
    .fill(/Email: (.+)/.exec(access)![1]);
  await page
    .getByLabel("Mật khẩu *", { exact: true })
    .fill(/Password: (.+)/.exec(access)![1]);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/hop-thu");
  await expect(
    page.getByText("Khách kiểm thử liên hệ", { exact: true }).first(),
  ).toBeVisible();
  const fake = await page.request.post("/api/admin/upload", {
    headers: { Origin: new URL(page.url()).origin },
    multipart: {
      altVi: "Ảnh kiểm thử MIME giả",
      file: {
        name: "invalid.png",
        mimeType: "image/png",
        buffer: Buffer.from("<script>invalid</script>"),
      },
    },
  });
  expect(fake.status()).toBe(422);
});
test("FR-GEN-07 · newsletter double opt-in qua worker local thật", async ({
  page,
}) => {
  const email = `newsletter-e2e-${Date.now()}@example.invalid`;
  await page.goto("/");
  await page.locator("#newsletter-email").fill(email);
  await page.locator("footer input[name=consent]").check();
  const send = page.getByRole("button", {
    name: "Đăng ký nhận tin",
    exact: true,
  });
  await send.scrollIntoViewIfNeeded();
  await expect(send).toBeEnabled();
  await send.click();
  await expect(
    page.getByText(
      "Đã lưu yêu cầu. Bạn cần xác nhận qua email trước khi nhận bản tin.",
      { exact: true },
    ),
  ).toBeVisible();
  execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "scripts/worker.ts", "--once"],
    { windowsHide: true, stdio: "pipe" },
  );
  const schema = z.object({ to: z.string(), text: z.string() });
  const mail = fs
    .readdirSync(".local/mail")
    .map((file) =>
      schema.parse(JSON.parse(fs.readFileSync(`.local/mail/${file}`, "utf8"))),
    )
    .find((mail) => mail.to === email);
  expect(mail).toBeDefined();
  const url = /https?:\/\/[^\s]+/.exec(mail!.text)?.[0];
  if (!url) throw new Error("Confirmation URL missing from actual outbox");
  await page.goto(url);
  await page
    .getByRole("button", { name: "Xác nhận đăng ký", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Đã lưu lựa chọn của bạn.",
  );
});
test("FR-GEN-10 · từ chối analytics không tạo cookie theo dõi", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Từ chối phân tích" }).click();
  await expect(
    page.getByRole("button", { name: /Tùy chọn cookie.*Đã từ chối/ }),
  ).toBeVisible();
  const response = await page.request.post("/api/video-view", {
    headers: { Origin: new URL(page.url()).origin },
    data: { id: "not-a-real-video", playedSeconds: 10 },
  });
  expect(await response.json()).toMatchObject({
    counted: false,
    reason: "CONSENT_REQUIRED",
  });
  expect(
    (await page.context().cookies()).some((c) => c.name === "dh-video-browser"),
  ).toBe(false);
});
