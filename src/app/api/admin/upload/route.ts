import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin } from "@/lib/security";
import { limitedFormData, saveImage } from "@/lib/storage";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/domain";
import { apiError } from "@/lib/api";
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    checkOrigin(request);
    const fd = await limitedFormData(request, 6 * 1024 * 1024);
    const file = fd.get("file");
    const altVi = fd.get("altVi");
    const altEn = fd.get("altEn") ?? "";
    if (
      !(file instanceof File) ||
      typeof altVi !== "string" ||
      altVi.trim().length < 2 ||
      altVi.length > 500 ||
      typeof altEn !== "string" ||
      altEn.length > 500
    )
      throw new DomainError("ALT_REQUIRED", 422);
    const saved = await saveImage(file, altVi.trim(), altEn.trim(), false);
    const media = await db.$transaction(async (tx) => {
      const row = await tx.media.create({ data: saved });
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "media.upload",
          entity: "Media",
          entityId: row.id,
          diff: { mime: row.mime, size: row.size },
        },
      });
      return row;
    });
    return NextResponse.json(
      { id: media.id, altVi: media.altVi },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
