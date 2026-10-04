import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { put, get, del } from "@vercel/blob";
import { localAdapters, cloudPrototype } from "./deployment";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { DomainError } from "./domain";
function s3() {
  if (
    !process.env.R2_ENDPOINT ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_BUCKET
  )
    throw new DomainError("CONFIG_UNAVAILABLE", 503);
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}
function localPath(key: string) {
  if (!/^[a-f0-9-]+(?:-(?:320|640|1024|1600))?\.webp$/.test(key))
    throw new DomainError("INVALID_MEDIA_KEY");
  return path.join(process.cwd(), ".local", "media", key);
}
export async function putAsset(key: string, data: Buffer) {
  localPath(key); // Validate object keys for every adapter, not only filesystem.
  if (process.env.MEDIA_STORAGE === "vercel-blob") {
    await put(key, data, {
      access: "private",
      addRandomSuffix: false,
      contentType: "image/webp",
    });
  } else if (localAdapters()) {
    await fs.mkdir(".local/media", { recursive: true });
    await fs.writeFile(localPath(key), data);
  } else
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: data,
        ContentType: "image/webp",
      }),
    );
}
export async function getAsset(key: string) {
  // Packaged photographs are read-only assets supplied by the project owner.
  // Keep their path grammar separate from uploaded object-storage keys.
  if (/^\/images\/(paintings|visit)\/[a-z0-9-]+\.webp$/.test(key))
    return fs.readFile(path.join(process.cwd(), "public", key.slice(1)));
  localPath(key);
  if (process.env.MEDIA_STORAGE === "vercel-blob") {
    const asset = await get(key, { access: "private" });
    if (!asset || asset.statusCode !== 200)
      throw new DomainError("MEDIA_NOT_FOUND", 404);
    return Buffer.from(await new Response(asset.stream).arrayBuffer());
  }
  if (localAdapters()) return fs.readFile(localPath(key));
  const result = await s3().send(
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }),
  );
  if (!result.Body) throw new DomainError("MEDIA_NOT_FOUND", 404);
  return Buffer.from(await result.Body.transformToByteArray());
}
export async function deleteAsset(key: string) {
  localPath(key);
  if (process.env.MEDIA_STORAGE === "vercel-blob") await del(key);
  else if (localAdapters()) await fs.unlink(localPath(key)).catch(() => {});
  else
    await s3().send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }),
    );
}
async function scan(buffer: Buffer) {
  if (localAdapters()) return "DECODED_LOCAL";
  if (cloudPrototype()) return "DECODED_PROTOTYPE";
  const command = process.env.SCANNER_COMMAND;
  if (!command) throw new DomainError("SCANNER_UNAVAILABLE", 503);
  await new Promise<void>((resolve, reject) => {
    const process = spawn(command, ["--no-summary", "-"], {
      stdio: ["pipe", "ignore", "ignore"],
      windowsHide: true,
    });
    process.stdin.end(buffer);
    const timer = setTimeout(() => {
      process.kill();
      reject(new DomainError("SCAN_TIMEOUT", 503));
    }, 30000);
    process.on("error", () => {
      clearTimeout(timer);
      reject(new DomainError("SCANNER_UNAVAILABLE", 503));
    });
    process.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new DomainError("UNSAFE_FILE", 422));
    });
  });
  return "CLEAN";
}
export async function saveImage(
  file: File,
  altVi: string,
  altEn: string,
  isPrivate: boolean,
) {
  if (
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !/^.+\.(jpe?g|png|webp)$/i.test(file.name)
  )
    throw new DomainError("INVALID_IMAGE", 422);
  const buffer = Buffer.from(await file.arrayBuffer());
  const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  const png = buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP";
  if (
    (file.type === "image/jpeg" && !jpeg) ||
    (file.type === "image/png" && !png) ||
    (file.type === "image/webp" && !webp)
  )
    throw new DomainError("MIME_MISMATCH", 422);
  const image = sharp(buffer, { limitInputPixels: 40000000 }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height)
    throw new DomainError("INVALID_IMAGE", 422);
  const scanStatus = await scan(buffer);
  const uuid = randomUUID();
  const variants: Record<string, string> = {};
  const master = await image
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  const key = `${uuid}.webp`;
  await putAsset(key, master.data);
  for (const width of [320, 640, 1024, 1600]) {
    const variantKey = `${uuid}-${width}.webp`;
    await putAsset(
      variantKey,
      await sharp(master.data)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
    );
    variants[String(width)] = variantKey;
  }
  return {
    key,
    mime: "image/webp",
    size: master.data.length,
    width: master.info.width,
    height: master.info.height,
    altVi,
    altEn,
    isPrivate,
    variants,
    scanStatus,
  };
}
export async function limitedFormData(
  request: Request,
  maxBytes = 16 * 1024 * 1024,
) {
  const length = Number(request.headers.get("content-length"));
  if (length > maxBytes) throw new DomainError("PAYLOAD_TOO_LARGE", 413);
  if (!request.body) throw new DomainError("EMPTY_BODY");
  let size = 0;
  const stream = request.body.pipeThrough(
    new TransformStream({
      transform(chunk: Uint8Array, controller) {
        size += chunk.byteLength;
        if (size > maxBytes) throw new DomainError("PAYLOAD_TOO_LARGE", 413);
        controller.enqueue(chunk);
      },
    }),
  );
  return new Response(stream, {
    headers: { "Content-Type": request.headers.get("Content-Type") ?? "" },
  }).formData();
}
