import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { chromium } from "@playwright/test";

// Keep Lighthouse's default mobile/4G profile; do not change throttling to satisfy a score.
const seoOnly = process.argv.includes("--seo-only");
const folder = process.argv.includes("--source-update")
  ? "docs/qa/source-update"
  : "docs/qa";
fs.mkdirSync(folder, { recursive: true });
for (const [baseName, route] of [
  ["home-final", "/"],
  ["workshop-final", "/workshop/in-tranh-co-ban"],
]) {
  if (process.argv.includes("--workshop") && route === "/") continue;
  const name = seoOnly ? baseName.replace("final", "seo-final") : baseName;
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/lighthouse/cli/index.js",
      `http://127.0.0.1:3000${route}`,
      "--chrome-flags=--headless --no-sandbox --disable-gpu",
      seoOnly
        ? "--only-categories=seo"
        : "--only-categories=performance,accessibility,seo",
      "--output=json",
      "--output=html",
      `--output-path=${folder}/lighthouse-${name}`,
      "--quiet",
    ],
    {
      env: { ...process.env, CHROME_PATH: chromium.executablePath() },
      windowsHide: true,
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    process.exitCode = 1;
    break;
  }
  const report = JSON.parse(
    fs.readFileSync(`${folder}/lighthouse-${name}.report.json`, "utf8"),
  );
  console.log(
    JSON.stringify({
      route,
      scores: Object.fromEntries(
        Object.entries(report.categories).map(([key, value]) => [
          key,
          Math.round(value.score * 100),
        ]),
      ),
      lcp: report.audits["largest-contentful-paint"]?.numericValue,
      cls: report.audits["cumulative-layout-shift"]?.numericValue,
    }),
  );
}
