import { db } from "@/lib/db";
import { NextResponse } from "next/server";
export async function GET() {
  try {
    // A reachable, unmigrated DB must not report ready while pages fail.
    await db.$queryRaw`SELECT
      EXISTS(SELECT 1 FROM "Content" LIMIT 1),
      EXISTS(SELECT 1 FROM "AdminUser" LIMIT 1),
      EXISTS(SELECT 1 FROM "Registration" LIMIT 1),
      EXISTS(SELECT 1 FROM "Outbox" LIMIT 1)`;
    return NextResponse.json(
      {
        status: "ready",
        mode: process.env.APP_MODE,
        at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
