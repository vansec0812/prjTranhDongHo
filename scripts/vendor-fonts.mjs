import fs from "node:fs";
let css =
  "/* Self-hosted Fontsource fonts. Licenses: public/fonts/*-LICENSE. */\n";
fs.mkdirSync("public/fonts", { recursive: true });
for (const [name, styles] of [
  ["be-vietnam-pro", ["400", "500", "600"]],
  ["playfair-display", ["600", "700", "400-italic"]],
]) {
  for (const style of styles) {
    const root = `node_modules/@fontsource/${name}`;
    const full = fs.readFileSync(`${root}/${style}.css`, "utf8");
    for (const match of full.matchAll(
      /\/\*[^*]+\*\/\s*@font-face\s*\{[^}]+\}/g,
    )) {
      let face = match[0];
      if (
        !["vietnamese", "latin", "latin-ext"].some((subset) =>
          face.includes(
            `/* ${name}-${subset}-${style.replace("-italic", "")}-`,
          ),
        )
      )
        continue;
      face = face.replace(/url\(\.\/files\/([^\)]+)\)/g, (_, file) => {
        fs.copyFileSync(`${root}/files/${file}`, `public/fonts/${file}`);
        return `url(/fonts/${file})`;
      });
      css += face + "\n";
    }
  }
  fs.copyFileSync(
    `node_modules/@fontsource/${name}/LICENSE`,
    `public/fonts/${name}-LICENSE`,
  );
}
fs.writeFileSync("src/styles/fonts.css", css);
