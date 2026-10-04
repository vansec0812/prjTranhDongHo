// Normalize images before a serverless request so three 5 MB source images
// remain usable within Vercel's request-body limit. Server validates the actual
// resulting file again (MIME, magic bytes, pixels and size).
export async function prepareCloudImage(file: File) {
  if (
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new Error(
      "Ảnh phải là JPG, PNG hoặc WebP, tối đa 5 MB / JPG, PNG or WebP, maximum 5 MB",
    );
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40000000)
      throw new Error(
        "Ảnh có quá nhiều điểm ảnh / Image resolution is too large",
      );
    for (const edge of [1600, 1280, 1024, 800]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Không thể xử lý ảnh / Unable to process image");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.85),
      );
      if (blob && blob.size <= 1200000 && blob.type === "image/webp")
        return new File([blob], "attachment.webp", { type: "image/webp" });
    }
    throw new Error(
      "Không thể giảm dung lượng ảnh. Hãy chọn ảnh khác / Unable to prepare image. Choose another image",
    );
  } finally {
    bitmap.close();
  }
}
