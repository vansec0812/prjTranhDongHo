import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [375, 1440])
  test(`UI-26/30 · showcase tokens, states, accessibility ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-10-03T00:00:00+07:00"));
    await page.goto("/dev/ui");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toContainText("Giấy dó");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await expect(page).toHaveScreenshot(`showcase-${width}.png`, {
      fullPage: true,
      animations: "disabled",
    });
  });
