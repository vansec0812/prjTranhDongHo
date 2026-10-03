import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkOrigin } from "@/lib/security";
import { apiError } from "@/lib/api";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { choice } = z
      .object({ choice: z.enum(["accepted", "rejected"]) })
      .parse(await request.json());
    (await cookies()).set("dh-analytics-consent", choice, {
      httpOnly: true,
      secure: process.env.APP_MODE === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 31536000,
    });
    return NextResponse.json(
      { choice },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
