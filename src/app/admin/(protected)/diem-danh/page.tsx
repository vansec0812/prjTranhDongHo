import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DataTable } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
export default async function Attendance({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  await requireAdmin();
  const { session } = await searchParams;
  const rows = await db.registration.findMany({
    where: {
      status: { in: ["CONFIRMED", "ATTENDED", "NO_SHOW"] },
      ...(session ? { sessionId: session } : {}),
    },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      code: true,
      fullName: true,
      adults: true,
      children: true,
      status: true,
    },
  });
  return (
    <div className="stack">
      <h1>Danh sách điểm danh</h1>
      <PrintButton />
      <DataTable label="Danh sách điểm danh">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Họ tên</th>
            <th>Người lớn</th>
            <th>Trẻ em</th>
            <th>Trạng thái</th>
            <th>Có mặt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.code}</td>
              <td>{row.fullName}</td>
              <td>{row.adults}</td>
              <td>{row.children}</td>
              <td>{row.status}</td>
              <td>□</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}
