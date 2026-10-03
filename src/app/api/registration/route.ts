import { NextResponse } from "next/server";
import { registrationSchema } from "@/lib/domain";
import { createRegistration } from "@/lib/services/registration";
import {
  checkOrigin,
  captchaVerify,
  rateLimit,
  requestIdentity,
} from "@/lib/security";
import { apiError } from "@/lib/api";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit("registration", requestIdentity(request));
    const data = registrationSchema.parse(await request.json());
    await captchaVerify(data.captcha);
    return NextResponse.json(await createRegistration(data), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
