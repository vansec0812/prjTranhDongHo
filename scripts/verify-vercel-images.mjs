import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { transform } from "esbuild";
import { chromium } from "@playwright/test";

// Exercise the real browser canvas helper with three near-limit source images.
// This checks request preparation, not Blob credentials or a cloud upload.
const source = await sharp(randomBytes(1200 * 1200 * 3), {
  raw: { width: 1200, height: 1200, channels: 3 },
})
  .png()
  .toBuffer();
const code = await transform(
  await fs.readFile("src/lib/prepare-image.ts", "utf8"),
  {
    loader: "ts",
    format: "iife",
    globalName: "CloudImage",
  },
);
const browser = await chromium.launch();
let result;
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3000/lien-he");
  await page.addScriptTag({ content: code.code });
  result = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const form = new FormData();
    const output = [];
    for (let index = 0; index < 3; index++) {
      const original = new File([bytes], `source-${index}.png`, {
        type: "image/png",
      });
      const prepared = await CloudImage.prepareCloudImage(original);
      form.append("images", prepared);
      output.push({
        sourceBytes: original.size,
        preparedBytes: prepared.size,
        type: prepared.type,
      });
    }
    form.append(
      "data",
      JSON.stringify({
        message: "Image size verification",
        metadata: "x".repeat(2000),
      }),
    );
    const requestBytes = (await new Response(form).arrayBuffer()).byteLength;
    let oversizedRejected = false,
      invalidTypeRejected = false;
    try {
      await CloudImage.prepareCloudImage(
        new File([new Uint8Array(6 * 1024 * 1024)], "large.png", {
          type: "image/png",
        }),
      );
    } catch {
      oversizedRejected = true;
    }
    try {
      await CloudImage.prepareCloudImage(
        new File(["<svg></svg>"], "bad.svg", { type: "image/svg+xml" }),
      );
    } catch {
      invalidTypeRejected = true;
    }
    return { output, requestBytes, oversizedRejected, invalidTypeRejected };
  }, source.toString("base64"));
} finally {
  await browser.close();
}
assert(
  result.output.every(
    (file) =>
      file.sourceBytes > 4 * 1024 * 1024 && file.sourceBytes <= 5 * 1024 * 1024,
  ),
);
assert(
  result.output.every(
    (file) => file.preparedBytes <= 1200000 && file.type === "image/webp",
  ),
);
assert(result.requestBytes < 4.5 * 1024 * 1024);
assert(result.oversizedRejected && result.invalidTypeRejected);
await fs.writeFile(
  "docs/qa/vercel-prototype/images.json",
  JSON.stringify(
    {
      profile:
        "Real Chromium canvas; local page, no cloud upload/provider test",
      ...result,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(result));
