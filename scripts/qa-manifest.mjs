import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const files = [];
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(file);
    else files.push(file);
  }
}
for (const folder of ["src", "prisma", "scripts", "tests", ".github", "public"])
  walk(folder);
for (const file of fs.readdirSync("docs")) {
  if (file.endsWith(".md")) files.push(path.join("docs", file));
}
files.push(".env.example");
for (const file of fs.readdirSync(".")) {
  if (fs.statSync(file).isFile() && /\.(?:md|pdf|json|ts|mjs)$/.test(file))
    files.push(file);
}
fs.writeFileSync(
  "docs/qa/source-manifest.json",
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      commit: null,
      reason:
        "Repository chưa có Git; SHA-256 nhận diện chính xác bản local, không bịa commit.",
      files: files.sort().map((file) => ({
        path: file.replaceAll("\\", "/"),
        sha256: createHash("sha256")
          .update(fs.readFileSync(file))
          .digest("hex"),
      })),
    },
    null,
    2,
  ),
);
console.log(
  `Captured ${files.length} source/config/test hashes; excludes .env and .local.`,
);
