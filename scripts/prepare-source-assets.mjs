import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import convert from "heic-convert";

const root = process.cwd();
const paintings = JSON.parse(
  await fs.readFile("src/data/paintings.json", "utf8"),
);
await fs.mkdir("public/images/paintings", { recursive: true });
await fs.mkdir("public/images/visit", { recursive: true });
await fs.mkdir("public/tour", { recursive: true });
const manifest = [];
for (const art of paintings) {
  const input = await fs.readFile(path.join(root, "sourceImage", art.file));
  const output = `public/images/paintings/${art.slug}.webp`;
  await sharp(input).rotate().webp({ quality: 90 }).toFile(output);
  const metadata = await sharp(output).metadata();
  manifest.push({
    source: `sourceImage/${art.file}`,
    key: output.slice(6),
    width: metadata.width,
    height: metadata.height,
    size: (await fs.stat(output)).size,
    sha256: crypto.createHash("sha256").update(input).digest("hex"),
  });
}
const photos = [
  ["1.JPEG", "cho-tranh"],
  ["1 2.JPEG", "tuong-tranh"],
  ["1 3.JPEG", "giay-diep"],
  ["1 4.JPEG", "tu-lieu-lang-tranh"],
  ["2.JPEG", "sao-dieu-trung-bay"],
  ["2 2.JPEG", "che-mau"],
  ["2 3.JPEG", "bo-suu-tap"],
  ["4 2.JPEG", "van-khac"],
  ["4 3.JPEG", "tu-lieu-nghe"],
  ["IMG_3955.JPEG", "chi-tiet-van-khac"],
];
for (const [file, slug] of photos) {
  const input = await fs.readFile(path.join("sourceVR", file));
  const output = `public/images/visit/${slug}.webp`;
  await sharp(input)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(output);
  const metadata = await sharp(output).metadata();
  manifest.push({
    source: `sourceVR/${file}`,
    key: output.slice(6),
    width: metadata.width,
    height: metadata.height,
    size: (await fs.stat(output)).size,
    sha256: crypto.createHash("sha256").update(input).digest("hex"),
  });
}
for (let i = 1; i <= 4; i++) {
  const file = i === 1 ? "1 .360.HEIC" : `${i}.360.HEIC`;
  const input = await fs.readFile(path.join("sourceVR", file));
  const decoded = Buffer.from(
    await convert({ buffer: input, format: "JPEG", quality: 1 }),
  );
  const files = {};
  for (const [variant, width, quality, limit] of [
    ["large", 8192, 80, 6 * 1024 * 1024],
    ["mobile", 4096, 78, 2 * 1024 * 1024],
    ["preview", 512, 45, 60 * 1024],
    ["thumb", 240, 65, 30 * 1024],
  ]) {
    const output = `public/tour/scene-${i}-${variant}.jpg`;
    await sharp(decoded)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toFile(output);
    const metadata = await sharp(output).metadata();
    const size = (await fs.stat(output)).size;
    if (size > limit)
      throw new Error(`${output} exceeds the supplement asset budget`);
    files[variant] = {
      src: output.slice(6),
      width: metadata.width,
      height: metadata.height,
      bytes: size,
    };
  }
  manifest.push({
    source: `sourceVR/${file}`,
    sha256: crypto.createHash("sha256").update(input).digest("hex"),
    variants: files,
  });
  console.log(`Prepared panorama ${i}`);
}
await fs.writeFile(
  "public/tour/assets.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Prepared ${paintings.length} paintings, ${photos.length} exhibit photographs and 4 panoramas. Originals unchanged; embedded metadata removed.`,
);
