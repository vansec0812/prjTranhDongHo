import { test, expect } from "vitest";
import { getAsset } from "../../src/lib/storage";
test("Ảnh đóng gói có thể đọc qua API media mà không tìm nhầm trong object storage", async () => {
  const buffer = await getAsset("/images/paintings/dam-cuoi-chuot.webp");
  expect(buffer.subarray(0, 4).toString()).toBe("RIFF");
  expect(buffer.subarray(8, 12).toString()).toBe("WEBP");
  expect(buffer.length).toBeGreaterThan(1000);
});
test("Đường ảnh đóng gói không cho traversal hoặc đọc ngoài hai thư mục nguồn", async () => {
  for (const key of [
    "/images/paintings/../../.env",
    "/images/visit/../paintings/dam-cuoi-chuot.webp",
    "/images/private/secret.webp",
    "/images/paintings/a.svg",
  ]) {
    await expect(getAsset(key)).rejects.toMatchObject({
      code: "INVALID_MEDIA_KEY",
    });
  }
});
