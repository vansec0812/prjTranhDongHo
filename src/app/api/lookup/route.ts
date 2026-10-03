import { NextResponse } from "next/server";
import { z } from "zod";
import {
  lookupRegistration,
  cancelRegistration,
  acceptInvitation,
} from "@/lib/services/registration";
import { checkOrigin, rateLimit, requestIdentity } from "@/lib/security";
import { apiError } from "@/lib/api";
import { calendarFile } from "@/lib/ics";
import { canCancel } from "@/lib/domain";
import { getSettings } from "@/lib/content";
const schema = z.object({
  code: z.string().regex(/^DH-\d{4}-[A-F0-9]{4}$/),
  phone: z.string().max(40),
  action: z.enum(["lookup", "cancel", "ics", "accept"]).default("lookup"),
  token: z.string().max(200).optional(),
});
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = schema.parse(await request.json());
    await rateLimit("lookup-ip", requestIdentity(request), 20);
    await rateLimit("lookup-code", data.code, 10);
    if (data.action === "cancel")
      return NextResponse.json(await cancelRegistration(data.code, data.phone));
    if (data.action === "accept")
      return NextResponse.json(
        await acceptInvitation(data.token ?? "", data.code, data.phone),
      );
    const row = await lookupRegistration(data.code, data.phone);
    if (data.action === "ics") {
      if (!["NEW", "CONFIRMED"].includes(row.status))
        return NextResponse.json({ error: "NO_HELD_SEAT" }, { status: 409 });
      return new Response(
        calendarFile(
          row,
          row.session,
          row.session.workshop.content.titleVi,
          row.session.workshop.locationVi,
        ),
        {
          headers: {
            "Content-Type": "text/calendar;charset=utf-8",
            "Content-Disposition": 'attachment; filename="workshop.ics"',
            "Cache-Control": "no-store",
          },
        },
      );
    }
    const settings = await getSettings();
    return NextResponse.json(
      {
        code: row.code,
        status: row.status,
        startsAt: row.session.startsAt,
        title: row.session.workshop.content.titleVi,
        titleEn: row.session.workshop.content.titleEn,
        adults: row.adults,
        children: row.children,
        totalAmount: row.totalAmount,
        email: row.email.replace(/^(.).+(@.*)$/, "$1***$2"),
        canCancel:
          ["WAITLIST", "NEW", "CONFIRMED"].includes(row.status) &&
          canCancel(row.session.startsAt, new Date(), settings.cancelHours),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
