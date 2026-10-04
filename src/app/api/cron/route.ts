import { cronAuthorized } from "@/lib/cron-auth";
import { runScheduled, drainOutbox } from "@/lib/services/worker";
import { apiError } from "@/lib/api";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!cronAuthorized(request))
    return Response.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const scheduled = await runScheduled();
    const mail = await drainOutbox(30, 40000);
    return Response.json(
      { ...scheduled, ...mail },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
