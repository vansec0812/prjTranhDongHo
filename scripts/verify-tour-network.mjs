import fs from "node:fs/promises";
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: (1600 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const requests = [];
page.on("request", (request) =>
  requests.push({ url: request.url(), type: request.resourceType() }),
);
await page.goto("http://127.0.0.1:3000", { waitUntil: "load" });
const homeScripts = requests
  .filter((request) => request.type === "script")
  .map((request) => request.url);
// Read served chunks to identify the actual engine, rather than guessing chunk filenames.
const engineOnHome = [];
for (const url of homeScripts.filter((url) =>
  url.startsWith("http://127.0.0.1"),
)) {
  const code = await (await context.request.get(url)).text();
  if (/PhotoSphereViewer|photo-sphere-viewer|THREE\.WebGLRenderer/.test(code))
    engineOnHome.push(url);
}
requests.length = 0;
await page.goto("about:blank");
await cdp.send("Network.clearBrowserCache");
await page.goto("http://127.0.0.1:3000/tham-quan-360", {
  waitUntil: "domcontentloaded",
});
await page.locator(".tour-backdrop").evaluate(async (image) => {
  await image.decode();
  await new Promise((resolve) => requestAnimationFrame(resolve));
});
const previewPaintUpperBoundMs = await page.evaluate(() => performance.now());
await page
  .locator('.tour-experience[data-state="ready"]')
  .waitFor({ timeout: 60000 });
const sharpReadyUpperBoundMs = await page.evaluate(() => performance.now());
// Neighbor preload is started by the shell; wait for the actual image download, then time the selection.
await page.waitForFunction(() =>
  performance
    .getEntriesByType("resource")
    .some(
      (entry) =>
        entry.name.endsWith("/scene-2-mobile.jpg") && entry.responseEnd > 0,
    ),
);
const start = await page.evaluate(() => performance.now());
await page.getByRole("button", { name: "Điểm tiếp theo", exact: true }).click();
await page.locator('.tour-experience[data-state="ready"]').waitFor();
const preloadedTransitionUpperBoundMs =
  (await page.evaluate(() => performance.now())) - start;
const resources = await page.evaluate(() =>
  performance
    .getEntriesByType("resource")
    .filter((entry) => entry.name.includes("/tour/scene-"))
    .map((entry) => ({
      url: entry.name,
      start: entry.startTime,
      end: entry.responseEnd,
      bytes: entry.transferSize,
    })),
);
await fs.writeFile(
  "docs/qa/source-update/tour-network.json",
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      profile: {
        viewport: 375,
        downloadKbps: 1600,
        uploadKbps: 750,
        latencyMs: 150,
        cpuSlowdown: 4,
        browser: "Chromium emulated; not physical mobile",
        cacheInitiallyEmpty: true,
        tourCacheClearedAfterHomeCheck: true,
      },
      engineOnHome,
      previewPaintUpperBoundMs,
      sharpReadyUpperBoundMs,
      preloadedTransitionUpperBoundMs,
      resources,
      requests,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    engineOnHome: engineOnHome.length,
    previewPaintUpperBoundMs,
    sharpReadyUpperBoundMs,
    preloadedTransitionUpperBoundMs,
  }),
);
await context.close();
await browser.close();
