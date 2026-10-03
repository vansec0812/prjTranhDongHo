import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { publicSessions } from "@/lib/sessions";
import { dateLabel } from "@/lib/domain";
import { DataTable, Badge, Alert } from "@/components/ui";
export default async function Dashboard() {
  await requireAdmin();
  const [fresh, waiting, inbox, views, sessions, latest, failed] =
    await Promise.all([
      db.registration.count({ where: { status: "NEW" } }),
      db.registration.count({ where: { status: "WAITLIST" } }),
      db.contactMessage.count({ where: { status: "NEW" } }),
      db.videoView.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
      publicSessions(),
      db.registration.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          session: { include: { workshop: { include: { content: true } } } },
        },
      }),
      db.outbox.count({ where: { status: "FAILED" } }),
    ]);
  return (
    <div className="stack">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">HOẠT ĐỘNG TRONG XƯỞNG</p>
          <h1>Tổng quan</h1>
        </div>
        <Link href="/admin/video/moi" className="button">
          Đăng video mới
        </Link>
      </div>
      <div className="admin-kpis">
        {[
          ["Đăng ký mới", fresh],
          ["Danh sách chờ", waiting],
          ["Tin nhắn chưa đọc", inbox],
          ["Lượt xem 30 ngày", views],
        ].map(([label, value]) => (
          <div className="admin-kpi" key={label}>
            <strong>{value}</strong>
            <span className="meta">{label}</span>
          </div>
        ))}
      </div>
      {failed > 0 && (
        <Alert error>
          {failed} email gửi lỗi. Kiểm tra mục Email & công việc nền để gửi lại.
        </Alert>
      )}
      <Alert>
        Email local được ghi ra tệp để kiểm thử, chưa gửi tới người nhận qua
        internet.
      </Alert>
      <section>
        <div className="section-head">
          <h2>Buổi sắp tới</h2>
          <Link className="text-link" href="/admin/workshop">
            Quản lý buổi
          </Link>
        </div>
        <div className="grid-3">
          {sessions.slice(0, 3).map((s) => (
            <div className="panel" key={s.id}>
              <h3>{s.titleVi}</h3>
              <p className="meta">{s.labelVi}</p>
              <strong>
                {Math.round(((s.capacity - s.available) / s.capacity) * 100)}%
                lấp đầy
              </strong>
              <progress
                className="progress"
                value={s.capacity - s.available}
                max={s.capacity}
                aria-label="Tỉ lệ lấp đầy"
              />
              <p className="meta">
                {s.available}/{s.capacity} chỗ còn
              </p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="section-head">
          <h2>Đăng ký mới nhất</h2>
          <Link className="text-link" href="/admin/dang-ky">
            Xem đăng ký
          </Link>
        </div>
        <DataTable label="Đăng ký mới nhất">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Buổi</th>
              <th>Người</th>
              <th>Gửi lúc</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((r) => (
              <tr key={r.id}>
                <td>{r.code}</td>
                <td>{r.session.workshop.content.titleVi}</td>
                <td>{r.adults + r.children}</td>
                <td>{dateLabel(r.createdAt)}</td>
                <td>
                  <Badge>{r.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        {!latest.length && (
          <p className="meta">
            Chưa có đăng ký. Gửi form trên website để thử luồng thật.
          </p>
        )}
      </section>
    </div>
  );
}
