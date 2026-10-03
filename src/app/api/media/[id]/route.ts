import { db } from "@/lib/db";
import { getAsset } from "@/lib/storage";
import { requireAdmin } from "@/lib/auth";
import { DomainError } from "@/lib/domain";
import { apiError } from "@/lib/api";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const media = await db.media.findUnique({
      where: { id },
      include: {
        contents: { select: { status: true, publishedAt: true, isDemo: true } },
      },
    });
    if (!media || media.isDemo) throw new DomainError("MEDIA_NOT_FOUND", 404);
    if (process.env.APP_MODE === "production" && media.scanStatus !== "CLEAN")
      throw new DomainError("MEDIA_NOT_FOUND", 404);
    const visible = media.contents.some(
      (c) =>
        c.status === "PUBLISHED" &&
        (process.env.APP_MODE !== "production" || !c.isDemo) &&
        c.publishedAt &&
        c.publishedAt <= new Date(),
    );
    if (media.isPrivate || !visible) await requireAdmin();
    const buffer = await getAsset(media.key);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": media.mime,
        "Cache-Control":
          media.isPrivate || !visible
            ? "private, no-store"
            : "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
