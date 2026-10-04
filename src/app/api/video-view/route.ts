import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkOrigin, rateLimit, requestIdentity } from "@/lib/security";
import { DomainError } from "@/lib/domain";
import { hash } from "@/lib/ids";
import { apiError } from "@/lib/api";
const schema = z.object({
  id: z.string(),
  playedSeconds: z.number().int().min(10).max(86400),
});
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit("video", requestIdentity(request), 100);
    const data = schema.parse(await request.json());
    const jar = await cookies();
    if (jar.get("dh-analytics-consent")?.value !== "accepted")
      return NextResponse.json(
        { counted: false, reason: "CONSENT_REQUIRED" },
        { headers: { "Cache-Control": "no-store" } },
      );
    const browser =
      jar.get("dh-video-browser")?.value ?? randomBytes(24).toString("hex");
    const browserHash = hash(browser);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Video" WHERE id=${data.id} FOR UPDATE`;
      const video = await tx.video.findFirst({
        where: {
          id: data.id,
          content: {
            status: "PUBLISHED",
            publishedAt: { lte: new Date() },
            ...(process.env.APP_MODE === "production" ? { isDemo: false } : {}),
          },
        },
      });
      if (!video) throw new DomainError("VIDEO_NOT_FOUND", 404);
      if (
        !(await tx.videoView.count({
          where: {
            videoId: data.id,
            browserHash,
            createdAt: { gt: new Date(Date.now() - 1800000) },
          },
        }))
      ) {
        await tx.videoView.create({
          data: {
            videoId: data.id,
            browserHash,
            playedSeconds: data.playedSeconds,
          },
        });
        await tx.video.update({
          where: { id: data.id },
          data: { viewCount: { increment: 1 } },
        });
      }
    });
    jar.set("dh-video-browser", browser, {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.VERCEL === "1" || process.env.APP_MODE === "production",
      maxAge: 1800,
      path: "/",
    });
    return NextResponse.json({ counted: true });
  } catch (error) {
    return apiError(error);
  }
}
