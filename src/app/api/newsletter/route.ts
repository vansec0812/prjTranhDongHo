import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribe, newsletterToken } from "@/lib/services/contact";
import {
  checkOrigin,
  rateLimit,
  requestIdentity,
  captchaVerify,
} from "@/lib/security";
import { apiError } from "@/lib/api";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("subscribe"),
    email: z.email().max(200),
    language: z.enum(["vi", "en"]),
    consent: z.literal(true),
    captcha: z.string().min(1),
    website: z.literal(""),
  }),
  z.object({
    action: z.enum(["confirm", "unsubscribe"]),
    token: z.string().min(20).max(200),
  }),
]);
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = schema.parse(await request.json());
    if (data.action === "subscribe") {
      await rateLimit("newsletter-subscribe", requestIdentity(request));
      await captchaVerify(data.captcha);
      return NextResponse.json(
        await subscribe(data.email.toLowerCase(), data.language),
      );
    }
    await rateLimit("newsletter-token", requestIdentity(request), 20);
    return NextResponse.json(await newsletterToken(data.token, data.action));
  } catch (error) {
    return apiError(error);
  }
}
