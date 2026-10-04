import { NextResponse } from "next/server";
import { contactSchema, DomainError } from "@/lib/domain";
import { limitedFormData, saveImage } from "@/lib/storage";
import { createContact } from "@/lib/services/contact";
import {
  checkOrigin,
  captchaVerify,
  rateLimit,
  requestIdentity,
} from "@/lib/security";
import { apiError } from "@/lib/api";
import { dispatchCommittedMail } from "@/lib/services/worker";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit("contact", requestIdentity(request));
    const fd = await limitedFormData(request);
    const raw = fd.get("data");
    if (typeof raw !== "string") throw new DomainError("VALIDATION", 422);
    const data = contactSchema.parse(JSON.parse(raw));
    await captchaVerify(data.captcha);
    const files = fd
      .getAll("attachments")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (
      files.length > 3 ||
      files.reduce((n, f) => n + f.size, 0) > 15 * 1024 * 1024
    )
      throw new DomainError("ATTACHMENT_LIMIT", 422);
    const attachments = [];
    for (const file of files)
      attachments.push(
        await saveImage(
          file,
          "Ảnh đính kèm liên hệ",
          "Contact attachment",
          true,
        ),
      );
    const result = await createContact(data, attachments);
    await dispatchCommittedMail();
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
