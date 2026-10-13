import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const locale of ["vi", "en"] as const) {
  test(`FR-HIS-02: ${locale} milestone numbers stay visible, scroll and open sourced details`, async ({
    page,
  }) => {
    for (const width of [360, 375, 768, 1200, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(locale === "en" ? "/en/lich-su" : "/lich-su");
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("body")).not.toContainText(
        /Mốc minh họa từ SRS|Illustrative chronology from SRS|pending verification/,
      );
      const region = page.locator(".timeline");
      await expect(region.locator(".seal").nth(6)).toHaveText("VII");
      const geometry = await region.evaluate((element) => {
        const area = element.getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          badges: [...element.querySelectorAll(".seal")].map((seal) => {
            const box = seal.getBoundingClientRect();
            return {
              left: box.left,
              right: box.right,
              top: box.top,
              bottom: box.bottom,
            };
          }),
          area: {
            left: area.left,
            right: area.right,
            top: area.top,
            bottom: area.bottom,
          },
        };
      });
      expect(geometry.overflow).toBe(false);
      for (const badge of geometry.badges) {
        expect(badge.top).toBeGreaterThanOrEqual(geometry.area.top);
        expect(badge.bottom).toBeLessThanOrEqual(geometry.area.bottom);
        if (width < 768) expect(badge.left).toBeGreaterThanOrEqual(0);
      }
      if (width >= 768) {
        const buttons = page.locator(".timeline-controls button");
        await expect(buttons.first()).toBeDisabled();
        await buttons.last().click();
        await expect
          .poll(() => region.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
      }
    }
    const first = page.locator(".milestone").first();
    await first.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(first.locator("details")).toHaveAttribute("open", "");
    await expect(first.locator('a[href*="baotanglichsu.vn"]')).toBeVisible();
    await expect(page.locator(".milestone").last()).toContainText("2025");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}
