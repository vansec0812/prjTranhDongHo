import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const locale of ["vi", "en"] as const) {
  test(`UI-05/FR-HOME-01 ${locale}: compounds stay together and News works on desktop/mobile`, async ({
    page,
  }) => {
    for (const width of [360, 375, 768, 1024, 1200, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(locale === "en" ? "/en/lich-su" : "/lich-su");
      await expect(page.locator(".milestone h3").nth(2)).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const pairs = [];
        for (const element of document.querySelectorAll(".milestone h3")) {
          const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
          );
          let node;
          while ((node = walker.nextNode())) {
            const match = /quốc[ \u00a0]+gia/iu.exec(node.textContent ?? "");
            if (match) {
              const first = document.createRange();
              first.setStart(node, match.index);
              first.setEnd(node, match.index + 4);
              const last = document.createRange();
              last.setStart(node, match.index + match[0].length - 3);
              last.setEnd(node, match.index + match[0].length);
              pairs.push(
                Math.abs(
                  first.getBoundingClientRect().top -
                    last.getBoundingClientRect().top,
                ),
              );
            }
          }
        }
        const header = document.querySelector<HTMLElement>("header .nav-row");
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          headerOverflow: header
            ? header.scrollWidth > header.clientWidth
            : true,
          pairs,
        };
      });
      expect(geometry.overflow).toBe(false);
      expect(geometry.headerOverflow).toBe(false);
      if (locale === "vi") {
        expect(geometry.pairs.length).toBeGreaterThan(0);
        expect(geometry.pairs.every((distance) => distance <= 1)).toBe(true);
      }
      const desktop = page.locator("header nav.desktop-nav");
      let news = desktop.locator('a[href$="/tin-tuc"]');
      if (!(await desktop.isVisible())) {
        await page.locator("header button.mobile-only").click();
        news = page.locator("dialog[open] nav").locator('a[href$="/tin-tuc"]');
        await expect(news).toHaveCount(1);
        await page.keyboard.press("Escape");
        await expect(page.locator("header button.mobile-only")).toBeFocused();
        await page.locator("header button.mobile-only").click();
      }
      await news.click();
      await expect(page).toHaveURL(
        locale === "en" ? /\/en\/tin-tuc$/ : /\/tin-tuc$/,
      );
      await expect(page.locator("h1")).toHaveCount(1);
    }
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}
