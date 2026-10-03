import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Ảnh sourceImage · hover/focus, trang chi tiết, phóng to và liên hệ đúng tranh", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/thu-vien-tranh");
  const card = page.locator(".content-card").filter({
    has: page.getByRole("heading", { name: "Đám cưới chuột", exact: true }),
  });
  const image = card.locator("img");
  await expect(image).toHaveAttribute("src", /dam-cuoi-chuot/);
  await expect
    .poll(() =>
      image.evaluate((element) =>
        element instanceof HTMLImageElement ? element.naturalWidth : 0,
      ),
    )
    .toBeGreaterThan(0);
  await expect(card.locator(".image-summary")).toHaveCSS("opacity", "0");
  await card.hover();
  await expect(card.locator(".image-summary")).toHaveCSS("opacity", "1");
  await page.mouse.move(0, 0);
  await card.getByRole("link").focus();
  await expect(card.locator(".image-summary")).toHaveCSS("opacity", "1");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/thu-vien-tranh\/dam-cuoi-chuot$/);
  await expect(page.locator("h1")).toHaveText("Đám cưới chuột");
  await page.getByRole("button", { name: "Xem phóng to" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator("img")).toHaveAttribute(
    "src",
    /dam-cuoi-chuot/,
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Xem phóng to" }),
  ).toBeFocused();
  await page.getByRole("link", { name: "Liên hệ đặt tranh này" }).click();
  await expect(page).toHaveURL(/tranh=dam-cuoi-chuot/);
  await expect(page.getByText("Đám cưới chuột", { exact: true })).toBeVisible();
});

test("Ảnh sourceImage · tóm tắt đọc được trên mobile; trang catalog có chi tiết", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/thu-vien-tranh");
  const summary = page.locator(".content-card .image-summary").first();
  await expect(summary).toHaveCSS("opacity", "1");
  await expect(summary).toContainText("đám rước");
  await page.goto("/san-pham/dam-cuoi-chuot");
  await expect(page.locator("h1")).toHaveText("Đám cưới chuột");
  await expect(
    page.getByRole("link", { name: "Liên hệ đặt tranh này" }),
  ).toHaveAttribute("href", /tranh=dam-cuoi-chuot/);
  await expect(page.locator("body")).not.toContainText(/SRS|Prototype|Bài mẫu/);
});

test("FR-VR-01/03/05/06/09/10/15 · tour thật, chọn điểm, popup, URL và đổi VI/EN", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/tham-quan-360?diem=phong-tranh");
  await expect(page.locator(".tour-experience")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(page.locator(".tour-heading h2")).toHaveText(
    "Giữa những bức tranh",
  );
  await expect(page.locator(".tour-canvas canvas")).toBeVisible();
  await expect(
    page
      .locator(".tour-bottom")
      .getByRole("link", { name: "Giữ chỗ workshop" }),
  ).toHaveAttribute("href", /\/workshop\/in-tranh-co-ban/);
  await expect(
    page.getByRole("button", { name: "Tự xoay góc nhìn", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Phóng to", exact: true }).click();
  await page.getByRole("button", { name: "Thu nhỏ", exact: true }).click();
  const info = page.locator(".tour-marker-info");
  await expect(info).toBeVisible();
  await info.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(
    "Hứng dừa",
  );
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "Xem chi tiết tranh" }),
  ).toHaveAttribute("href", "/thu-vien-tranh/hung-dua");
  await page.keyboard.press("Escape");
  await expect(info).toBeFocused();
  const opener = page.getByRole("button", {
    name: "Các điểm tham quan",
    exact: true,
  });
  await opener.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /02 · Màu và nền giấy/ })
    .click();
  await expect(page).toHaveURL(/diem=mau-va-giay/);
  await expect(page.locator(".tour-experience")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page
    .locator(".tour-map")
    .getByRole("button", { name: "3. Bên bàn in" })
    .click();
  await expect(page).toHaveURL(/diem=ban-in/);
  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/virtual-tour\?diem=ban-in/);
  await expect(page.locator(".tour-heading h2")).toHaveText(
    "At the printing table",
  );
  await page.getByRole("link", { name: "VI", exact: true }).click();
  await expect(page).toHaveURL(/\/tham-quan-360\?diem=ban-in/);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("FR-VR-12/13 · fullscreen, fallback ảnh khi WebGL không có, không tự phát audio", async ({
  page,
}) => {
  await page.goto("/tham-quan-360");
  await expect(page.locator(".tour-experience")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(
    page.getByRole("button", { name: "Thuyết minh", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Toàn màn hình", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await page
    .getByRole("button", { name: "Toàn màn hình", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (contextId: string, options?: unknown) {
        if (contextId.startsWith("webgl")) return null;
        return Reflect.apply(original, this, [contextId, options]);
      },
    });
  });
  await page.reload();
  await expect(page.locator(".tour-experience")).toHaveAttribute(
    "data-state",
    "error",
  );
  await expect(page.locator(".tour-flat img")).toBeVisible();
  await page
    .getByRole("button", { name: "Các điểm tham quan", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".tour-scene-list > button"),
  ).toHaveCount(4);
});

test("FR-VR-04/15 · chuyển cảnh có đường về, back giữ điểm và deep link không hợp lệ an toàn", async ({
  page,
}) => {
  await page.goto("/tham-quan-360?diem=khong-ton-tai");
  await expect(page.locator(".tour-heading h2")).toHaveText(
    "Một phiên chợ tranh",
  );
  await expect(page.locator(".tour-experience")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page
    .getByRole("button", { name: "Điểm tiếp theo", exact: true })
    .click();
  await expect(page.locator(".tour-heading h2")).toHaveText("Màu và nền giấy");
  await expect(page.locator(".tour-experience")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page
    .getByRole("button", { name: "Điểm tiếp theo", exact: true })
    .click();
  await page.goBack();
  await expect(page.locator(".tour-heading h2")).toHaveText("Màu và nền giấy");
  await page.getByRole("button", { name: "Điểm trước", exact: true }).click();
  await expect(page.locator(".tour-heading h2")).toHaveText(
    "Một phiên chợ tranh",
  );
});
