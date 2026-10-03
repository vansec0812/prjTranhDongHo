import fs from "node:fs";
import * as mupdf from "mupdf";
fs.mkdirSync("docs/srs/rendered", { recursive: true });
const doc = mupdf.Document.openDocument(
  fs.readFileSync("SRS_Website_Tranh_Dong_Ho.pdf"),
  "application/pdf",
);
let text = "";
for (let i = 0; i < doc.countPages(); i++) {
  const page = doc.loadPage(i);
  text += `\n\n--- PAGE ${i + 1} ---\n${page.toStructuredText().asText()}`;
  if (i >= 18)
    fs.writeFileSync(
      `docs/srs/rendered/page-${i + 1}.png`,
      page
        .toPixmap(
          mupdf.Matrix.scale(1.3, 1.3),
          mupdf.ColorSpace.DeviceRGB,
          false,
          true,
        )
        .asPNG(),
    );
}
fs.writeFileSync("docs/srs/extracted.txt", text);
console.log(`${doc.countPages()} pages extracted; visual reference rendered.`);
