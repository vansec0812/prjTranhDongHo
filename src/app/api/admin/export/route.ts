import ExcelJS from "exceljs";
import { RegStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
function safe(value: string | number) {
  return typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(value)
    ? "'" + value
    : value;
}
function csv(value: string | number) {
  return '"' + String(safe(value)).replace(/"/g, '""') + '"';
}
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    const status = Object.values(RegStatus).find(
      (s) => s === params.get("status"),
    );
    const session = params.get("session");
    const subscribers = type === "subscribers";
    let columns: string[], rows: Array<Array<string | number>>;
    if (subscribers) {
      columns = ["Email", "Ngôn ngữ", "Xác nhận"];
      const list = await db.subscriber.findMany({
        where: { confirmedAt: { not: null }, unsubscribedAt: null },
        take: 10000,
      });
      rows = list.map((r) => [
        r.email,
        r.language,
        r.confirmedAt?.toISOString() ?? "",
      ]);
    } else {
      columns = [
        "Mã",
        "Họ tên",
        "SĐT",
        "Email",
        "Người lớn",
        "Trẻ em",
        "Tổng VND",
        "Trạng thái",
      ];
      const list = await db.registration.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(session ? { sessionId: session } : {}),
        },
        take: 10000,
        orderBy: { createdAt: "asc" },
      });
      rows = list.map((r) => [
        r.code,
        r.fullName,
        r.phone,
        r.email,
        r.adults,
        r.children,
        r.totalAmount,
        r.status,
      ]);
    }
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "export",
        entity: subscribers ? "Subscriber" : "Registration",
        entityId: "filtered",
        diff: {
          count: rows.length,
          status: status ?? null,
          session: session ?? null,
        },
      },
    });
    if (params.get("format") === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(subscribers ? "Bản tin" : "Đăng ký");
      sheet.addRow(columns);
      for (const row of rows) sheet.addRow(row.map(safe));
      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="dongho-export.xlsx"',
          "Cache-Control": "private, no-store",
        },
      });
    }
    return new Response(
      "\ufeff" +
        [columns, ...rows].map((row) => row.map(csv).join(",")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": 'attachment; filename="dongho-export.csv"',
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
