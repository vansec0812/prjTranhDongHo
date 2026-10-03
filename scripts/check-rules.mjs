import fs from "node:fs";
import path from "node:path";
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((f) =>
      f.isDirectory()
        ? files(path.join(dir, f.name))
        : [path.join(dir, f.name)],
    );
}
const failures = [];
const palette = [
  "#f2e6cc",
  "#e9dab8",
  "#1e1a15",
  "#b3322a",
  "#d8a12e",
  "#2d4f4a",
  "#7a4e2d",
];
const tokens = fs.readFileSync("src/styles/tokens.css", "utf8");
for (const color of palette)
  if (!tokens.includes(color)) failures.push(`Missing locked color ${color}`);
for (const file of files("src")) {
  const code = fs.readFileSync(file, "utf8");
  if (
    file.endsWith(".css") &&
    !file.endsWith("tokens.css") &&
    /(#[a-f0-9]{3,8}\b|\brgba?\(|\bhsla?\()/i.test(code)
  )
    failures.push(`${file}: colors must reference tokens`);
  if (/href=["']#["']/.test(code)) failures.push(`${file}: empty href`);
  if (/\blocalStorage\b/.test(code))
    failures.push(
      `${file}: localStorage needs explicit review; no simulated server functionality`,
    );
  if (/:\s*any\b|as\s+any\b|@ts-ignore|eslint-disable/.test(code))
    failures.push(`${file}: unsafe type/lint suppression`);
  if (file.endsWith(".css"))
    for (const match of code.matchAll(/box-shadow:\s*([^;]+);/g))
      if (
        !["var(--hard-shadow)", "none", "0 0 0 var(--ink)"].includes(
          match[1].trim(),
        )
      )
        failures.push(`${file}: unapproved shadow`);
}
for (const file of [".env.example", "README.md"]) {
  const code = fs.readFileSync(file, "utf8");
  if (/-----BEGIN .*PRIVATE KEY-----/.test(code))
    failures.push(`${file}: secret`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  "Locked palette, token colors, links, type suppression and localStorage checks passed.",
);
