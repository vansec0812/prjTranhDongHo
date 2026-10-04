import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentKind } from "@prisma/client";
import { db } from "@/lib/db";
import { contentInput } from "@/lib/services/cms";
import { requireAdmin } from "@/lib/auth";
import { openPII } from "@/lib/security";
import { getSettings, contentInclude, contentHref } from "@/lib/content";
import { adminModules, contentLabels } from "@/lib/admin";
import { dateLabel } from "@/lib/domain";
import {
  ActionForm,
  ActionButton,
  type ActionField,
} from "@/components/admin-actions";
import { CmsForm } from "@/components/cms-form";
import { RegistrationTable } from "@/components/registration-table";
import { DataTable, Badge, Alert, Empty } from "@/components/ui";
import { AccountPanel } from "@/components/account-panel";
import { HomeSettings } from "@/components/home-settings";
type Props = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const str = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : "";
export default async function AdminModule({ params, searchParams }: Props) {
  const admin = await requireAdmin();
  const { path } = await params;
  const query = await searchParams;
  const sectionConfig = adminModules.find((m) => m.path === path[0]);
  if (!sectionConfig || path.length > 2) notFound();
  if (sectionConfig.kind) {
    const kind =
      sectionConfig.path === "noi-dung" &&
      ["MILESTONE", "FAQ", "HERO", "PAGE"].includes(str(query.kind))
        ? (Object.values(ContentKind).find((k) => k === str(query.kind)) ??
          sectionConfig.kind)
        : sectionConfig.kind;
    if (path[1]) {
      const item =
        path[1] === "moi"
          ? null
          : await db.content.findFirst({
              where: { id: path[1], kind },
              include: contentInclude,
            });
      if (path[1] !== "moi" && !item) notFound();
      const [media, categories] = await Promise.all([
        db.media.findMany({
          where: { isPrivate: false },
          select: { id: true, altVi: true },
          orderBy: { createdAt: "desc" },
        }),
        db.category.findMany({
          where: { kind },
          select: { id: true, titleVi: true },
        }),
      ]);
      return (
        <CmsForm
          module={sectionConfig.path}
          media={media}
          categories={categories}
          initial={
            item
              ? contentInput.parse({
                  kind: item.kind,
                  slug: item.slug,
                  titleVi: item.titleVi,
                  titleEn: item.titleEn,
                  summaryVi: item.summaryVi,
                  summaryEn: item.summaryEn,
                  bodyVi: item.bodyVi,
                  bodyEn: item.bodyEn,
                  status: item.status,
                  categoryId: item.categoryId ?? "",
                  mediaId: item.mediaId ?? "",
                  featured: item.featured,
                  sortOrder: item.sortOrder,
                  scheduledAt: item.scheduledAt?.toISOString() ?? "",
                  ...item.painting,
                  ...item.video,
                  ...item.workshop,
                  ...item.milestone,
                  ...item.artisan,
                  ...item.product,
                  ...item.faq,
                  ...item.hero,
                  id: item.id,
                  widthCm: item.painting?.widthCm ?? 0,
                  heightCm: item.painting?.heightCm ?? 0,
                  priceRef: item.product?.priceRef ?? 0,
                })
              : { kind }
          }
        />
      );
    }
    const q = str(query.q).slice(0, 100);
    const status = str(query.status);
    const rows = await db.content.findMany({
      where: {
        kind,
        ...(q ? { titleVi: { contains: q, mode: "insensitive" } } : {}),
        ...(["DRAFT", "PUBLISHED", "SCHEDULED"].includes(status)
          ? {
              status:
                status === "DRAFT"
                  ? "DRAFT"
                  : status === "PUBLISHED"
                    ? "PUBLISHED"
                    : "SCHEDULED",
            }
          : {}),
      },
      include: contentInclude,
      take: 50,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const workshops =
      kind === "WORKSHOP"
        ? await db.workshop.findMany({
            include: {
              content: true,
              sessions: { orderBy: { startsAt: "asc" } },
            },
          })
        : [];
    return (
      <div className="stack">
        <div className="admin-toolbar">
          <h1>{sectionConfig.label}</h1>
          <Link
            className="button"
            href={`/admin/${sectionConfig.path}/moi${kind !== sectionConfig.kind ? "?kind=" + kind : ""}`}
          >
            Thêm {contentLabels[kind].toLowerCase()}
          </Link>
        </div>
        {sectionConfig.path === "noi-dung" && (
          <nav className="filters" aria-label="Loại nội dung">
            {(["PAGE", "MILESTONE", "FAQ", "HERO"] as const).map((k) => (
              <Link
                className={`filter${kind === k ? " active" : ""}`}
                href={`/admin/noi-dung?kind=${k}`}
                key={k}
              >
                {contentLabels[k]}
              </Link>
            ))}
          </nav>
        )}
        <form className="grid-3" method="get">
          <input type="hidden" name="kind" value={kind} />
          <div className="field">
            <label htmlFor="content-q">Tìm tiêu đề</label>
            <input id="content-q" className="input" name="q" defaultValue={q} />
          </div>
          <div className="field">
            <label htmlFor="content-status">Trạng thái</label>
            <select id="content-status" name="status" defaultValue={status}>
              <option value="">Tất cả</option>
              <option value="DRAFT">Nháp</option>
              <option value="PUBLISHED">Đã đăng</option>
              <option value="SCHEDULED">Hẹn giờ</option>
            </select>
          </div>
          <button className="button">Lọc</button>
        </form>
        <DataTable label={sectionConfig.label}>
          <thead>
            <tr>
              <th>Tiêu đề / đường dẫn</th>
              <th>VI / EN</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.titleVi}</strong>
                  <br />
                  {item.slug}
                </td>
                <td>VI {item.titleEn ? "· EN" : "· EN chưa có"}</td>
                <td>
                  <Badge>{item.status}</Badge>
                </td>
                <td>
                  <div className="flex wrap">
                    <Link
                      className="button secondary"
                      href={`/admin/${sectionConfig.path}/${item.id}${kind !== sectionConfig.kind ? "?kind=" + kind : ""}`}
                    >
                      Sửa
                    </Link>
                    {item.status === "PUBLISHED" && (
                      <Link
                        className="text-link"
                        href={contentHref(item, "vi")}
                        target="_blank"
                      >
                        Xem website
                      </Link>
                    )}
                    <ActionButton
                      action="content.hide"
                      preset={{ id: item.id }}
                      label="Ẩn nội dung"
                      confirm
                    />
                    <Link
                      className="text-link"
                      href={`/admin/preview/${item.id}`}
                      target="_blank"
                    >
                      Preview đã lưu
                    </Link>
                    <ActionButton
                      action="content.delete"
                      preset={{ id: item.id }}
                      label="Xóa nội dung"
                      confirm
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        {!rows.length && <Empty>Chưa có nội dung phù hợp.</Empty>}
        {(kind === "PAINTING" || kind === "VIDEO") && (
          <details className="panel">
            <summary>Thêm danh mục</summary>
            <ActionForm
              action="category.save"
              preset={{ kind }}
              fields={[
                { name: "titleVi", label: "Tên VI", required: true },
                { name: "titleEn", label: "Tên EN" },
                { name: "slug", label: "Slug", required: true },
              ]}
              label="Lưu danh mục"
            />
          </details>
        )}
        {kind === "WORKSHOP" && (
          <section className="stack">
            <h2>Buổi workshop</h2>
            {workshops.map((workshop) => (
              <div className="panel stack" key={workshop.id}>
                <h3>{workshop.content.titleVi}</h3>
                <DataTable label={`Buổi ${workshop.content.titleVi}`}>
                  <thead>
                    <tr>
                      <th>Ngày giờ</th>
                      <th>Sức chứa</th>
                      <th>Trạng thái</th>
                      <th>Điều chỉnh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workshop.sessions.map((session) => (
                      <tr key={session.id}>
                        <td>{dateLabel(session.startsAt)}</td>
                        <td>{session.capacity}</td>
                        <td>{session.status}</td>
                        <td>
                          <details>
                            <summary className="text-link">Chỉnh buổi</summary>
                            <ActionForm
                              action="session.update"
                              preset={{ id: session.id }}
                              confirm
                              fields={[
                                {
                                  name: "capacity",
                                  label: "Sức chứa",
                                  type: "number",
                                  value: session.capacity,
                                  required: true,
                                },
                                {
                                  name: "status",
                                  label: "Trạng thái",
                                  type: "select",
                                  value: session.status,
                                  options: [
                                    { value: "OPEN", label: "Mở" },
                                    { value: "CLOSED", label: "Đóng" },
                                    { value: "CANCELLED", label: "Hủy buổi" },
                                  ],
                                },
                                {
                                  name: "reason",
                                  label: "Lý do khi hủy",
                                  type: "textarea",
                                },
                              ]}
                            />
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
                <details>
                  <summary className="text-link">
                    Thêm buổi / nhân bản theo tuần
                  </summary>
                  <ActionForm
                    action="session.create"
                    preset={{ workshopId: workshop.id }}
                    fields={[
                      {
                        name: "startsAt",
                        label: "Bắt đầu (ISO 8601 +07:00)",
                        value: "2026-10-24T09:00:00+07:00",
                        required: true,
                      },
                      {
                        name: "endsAt",
                        label: "Kết thúc (ISO 8601 +07:00)",
                        value: "2026-10-24T11:00:00+07:00",
                        required: true,
                      },
                      {
                        name: "capacity",
                        label: "Sức chứa",
                        type: "number",
                        value: 20,
                        required: true,
                      },
                      {
                        name: "language",
                        label: "Ngôn ngữ",
                        type: "select",
                        value: "vi",
                        options: [
                          { value: "vi", label: "Tiếng Việt" },
                          { value: "en", label: "English" },
                        ],
                      },
                      {
                        name: "weeks",
                        label: "Số tuần (1–12, không sao chép đăng ký)",
                        type: "number",
                        value: 1,
                      },
                    ]}
                    label="Tạo buổi"
                  />
                </details>
              </div>
            ))}
          </section>
        )}
      </div>
    );
  }
  if (path[1]) notFound();
  if (sectionConfig.path === "dang-ky") {
    const status = str(query.status);
    const valid = [
      "WAITLIST",
      "NEW",
      "CONFIRMED",
      "ATTENDED",
      "NO_SHOW",
      "CANCELLED",
    ];
    const selectedStatus = valid.includes(status)
      ? Object.values((await import("@prisma/client")).RegStatus).find(
          (v) => v === status,
        )
      : undefined;
    const sessions = await db.workshopSession.findMany({
      include: { workshop: { include: { content: true } } },
      orderBy: { startsAt: "asc" },
    });
    const q = str(query.q).slice(0, 100);
    const rows = await db.registration.findMany({
      where: {
        ...(selectedStatus ? { status: selectedStatus } : {}),
        ...(str(query.session) ? { sessionId: str(query.session) } : {}),
        ...(q
          ? {
              OR: [
                { code: { contains: q, mode: "insensitive" } },
                { fullName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        session: { include: { workshop: { include: { content: true } } } },
      },
    });
    return (
      <div className="stack">
        <div className="admin-toolbar">
          <h1>Đăng ký workshop</h1>
          <div className="flex wrap">
            <Link
              prefetch={false}
              className="button secondary"
              href={`/api/admin/export?${new URLSearchParams({ type: "registrations", status, session: str(query.session) })}`}
            >
              Xuất CSV
            </Link>
            <Link
              prefetch={false}
              className="button secondary"
              href={`/api/admin/export?${new URLSearchParams({ type: "registrations", format: "xlsx", status, session: str(query.session) })}`}
            >
              Xuất Excel
            </Link>
            <Link
              className="button secondary"
              href={`/admin/diem-danh?session=${str(query.session)}`}
            >
              In điểm danh
            </Link>
          </div>
        </div>
        <form className="grid-3" method="get">
          <div className="field">
            <label htmlFor="reg-session">Buổi</label>
            <select
              id="reg-session"
              name="session"
              defaultValue={str(query.session)}
            >
              <option value="">Tất cả</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {dateLabel(s.startsAt)} · {s.workshop.content.titleVi}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="reg-status">Trạng thái</label>
            <select id="reg-status" name="status" defaultValue={status}>
              <option value="">Tất cả</option>
              {valid.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="reg-q">Tên / SĐT / Mã</label>
            <input className="input" id="reg-q" name="q" defaultValue={q} />
          </div>
          <button className="button">Lọc đăng ký</button>
        </form>
        <RegistrationTable
          rows={rows.map((r) => ({
            id: r.id,
            code: r.code,
            fullName: r.fullName,
            phone: r.phone,
            adults: r.adults,
            children: r.children,
            total: r.totalAmount,
            status: r.status,
            session:
              r.session.workshop.content.titleVi +
              " · " +
              dateLabel(r.session.startsAt),
            createdAt: dateLabel(r.createdAt),
            note: openPII(r.internalNote),
          }))}
        />
      </div>
    );
  }
  if (sectionConfig.path === "hop-thu") {
    const rows = await db.contactMessage.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        attachments: true,
        artisan: { include: { content: true } },
        painting: { include: { content: true } },
      },
    });
    return (
      <div className="stack">
        <h1>Hộp thư liên hệ</h1>
        <p className="meta">
          Đính kèm riêng tư, chỉ admin xem. Email local không chuyển tin sang Đã
          trả lời.
        </p>
        {rows.length ? (
          rows.map((row) => (
            <details className="panel" key={row.id}>
              <summary className="text-link">
                <span>{row.fullName}</span> · {row.topic} ·{" "}
                {dateLabel(row.createdAt)} · {row.status}
              </summary>
              <div className="stack">
                <p>
                  {row.email} · {row.phone}
                </p>
                <p style={{ whiteSpace: "pre-wrap" }}>{row.message}</p>
                {row.painting && <p>Tranh: {row.painting.content.titleVi}</p>}
                {row.artisan && <p>Nghệ nhân: {row.artisan.content.titleVi}</p>}
                {row.attachments.map((m) => (
                  <a
                    className="text-link"
                    key={m.id}
                    href={`/api/media/${m.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Xem ảnh đính kèm ({m.size} bytes)
                  </a>
                ))}
                <ActionForm
                  action="contact.update"
                  preset={{ id: row.id }}
                  fields={[
                    {
                      name: "status",
                      label: "Trạng thái xử lý",
                      type: "select",
                      value:
                        row.status === "REPLIED" ? "PROCESSING" : row.status,
                      options: [
                        { value: "NEW", label: "Mới" },
                        { value: "PROCESSING", label: "Đang xử lý" },
                        { value: "ARCHIVED", label: "Lưu trữ" },
                      ],
                    },
                    {
                      name: "note",
                      label: "Ghi chú nội bộ",
                      type: "textarea",
                      value: openPII(row.internalNote),
                    },
                  ]}
                />
                <ActionForm
                  action="contact.reply"
                  preset={{ id: row.id }}
                  fields={[
                    {
                      name: "body",
                      label: "Nội dung email trả lời (20–5000 ký tự)",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                  label="Đưa phản hồi vào hàng đợi"
                />
              </div>
            </details>
          ))
        ) : (
          <Empty>Chưa có liên hệ. Gửi form public để thử lưu hộp thư.</Empty>
        )}
      </div>
    );
  }
  if (sectionConfig.path === "cau-hinh") {
    const settings = await getSettings();
    const fields: ActionField[] = [
      ...(
        [
          "studioVi",
          "studioEn",
          "addressVi",
          "addressEn",
          "hoursVi",
          "hoursEn",
          "phone",
          "email",
          "zalo",
          "facebook",
          "messenger",
          "mapQuery",
          "bankVi",
          "bankEn",
          "quoteVi",
          "quoteEn",
          "quoteArtisan",
        ] as const
      ).map((name) => ({
        name,
        label: {
          studioVi: "Tên cơ sở VI",
          studioEn: "Tên cơ sở EN",
          addressVi: "Địa chỉ VI",
          addressEn: "Địa chỉ EN",
          hoursVi: "Giờ mở cửa VI",
          hoursEn: "Giờ mở cửa EN",
          phone: "Số điện thoại",
          email: "Email",
          zalo: "Zalo URL",
          facebook: "Facebook URL",
          messenger: "Messenger URL",
          mapQuery: "Địa điểm bản đồ",
          bankVi: "Hướng dẫn thanh toán VI",
          bankEn: "Hướng dẫn thanh toán EN",
          quoteVi: "Lời nghệ nhân VI (đã xác minh)",
          quoteEn: "Lời nghệ nhân EN",
          quoteArtisan: "Tên nghệ nhân",
        }[name],
        value: settings[name],
      })),
      {
        name: "cancelHours",
        label: "Số giờ tối thiểu để khách tự hủy",
        type: "number",
        value: settings.cancelHours,
      },
      {
        name: "almostFullPercent",
        label: "Ngưỡng sắp hết (%)",
        type: "number",
        value: settings.almostFullPercent,
      },
    ];
    return (
      <div className="stack">
        <h1>Cấu hình cơ sở</h1>
        <Alert>
          Chỉ nhập thông tin, tài khoản ngân hàng và lời trích được cơ sở xác
          nhận. Prototype không thu tiền.
        </Alert>
        <div className="panel">
          <ActionForm
            action="settings.save"
            preset={{
              stats: settings.stats,
              heroPaintingIds: settings.heroPaintingIds,
            }}
            fields={fields}
            nested
            label="Lưu cấu hình"
          />
        </div>
        <HomeSettings
          initial={settings}
          paintings={(
            await db.content.findMany({
              where: {
                kind: "PAINTING",
                status: "PUBLISHED",
                publishedAt: { lte: new Date() },
              },
              select: { id: true, titleVi: true },
              orderBy: { sortOrder: "asc" },
            })
          ).map((p) => ({ id: p.id, title: p.titleVi }))}
        />
        <h2>Số liệu đang lưu</h2>
        <p className="meta">
          Dữ liệu lấy từ cấu hình, không tự tạo số để lấp bố cục.
        </p>
        <DataTable label="Số liệu demo">
          <thead>
            <tr>
              <th>Giá trị</th>
              <th>Nhãn VI</th>
              <th>Nhãn EN</th>
            </tr>
          </thead>
          <tbody>
            {settings.stats.map((s) => (
              <tr key={s.labelVi}>
                <td>{s.value}</td>
                <td>{s.labelVi}</td>
                <td>{s.labelEn}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    );
  }
  if (sectionConfig.path === "media") {
    const rows = await db.media.findMany({
      where: { isPrivate: false },
      include: {
        contents: { select: { id: true, titleVi: true, kind: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return (
      <div className="stack">
        <h1>Thư viện media</h1>
        <Alert>
          Tải ảnh trong form nội dung để bắt buộc alt và kiểm tra server. SVG
          minh họa SRS là tài nguyên repo; endpoint upload cấm SVG/HTML.
        </Alert>
        <DataTable label="Media và nơi đang dùng">
          <thead>
            <tr>
              <th>Mô tả</th>
              <th>Định dạng / kích thước</th>
              <th>Nơi dùng</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{m.altVi}</td>
                <td>
                  {m.mime}
                  <br />
                  {m.width} × {m.height}
                </td>
                <td>
                  {m.contents.map((c) => c.titleVi).join(", ") ||
                    "Chưa gắn nội dung"}
                </td>
                <td>{m.scanStatus}</td>
                <td>
                  {m.contents.length ? (
                    <span>Đang dùng – không được xóa</span>
                  ) : (
                    <ActionButton
                      action="media.delete"
                      preset={{ id: m.id }}
                      label="Xóa tham chiếu"
                      confirm
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    );
  }
  if (sectionConfig.path === "nhat-ky") {
    const rows = await db.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { name: true } } },
    });
    return (
      <div className="stack">
        <h1>Nhật ký thao tác</h1>
        <p className="meta">
          Append-only: PostgreSQL chặn UPDATE/DELETE. Không lưu nội dung ghi chú
          nhạy cảm trong diff.
        </p>
        <DataTable label="Audit log">
          <thead>
            <tr>
              <th>Lúc</th>
              <th>Người</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Thay đổi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{dateLabel(row.createdAt)}</td>
                <td>{row.admin.name}</td>
                <td>{row.action}</td>
                <td>
                  {row.entity} · {row.entityId}
                </td>
                <td>{JSON.stringify(row.diff)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    );
  }
  if (sectionConfig.path === "ban-tin") {
    const rows = await db.subscriber.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    return (
      <div className="stack">
        <div className="admin-toolbar">
          <h1>Bản tin</h1>
          <Link
            prefetch={false}
            className="button secondary"
            href="/api/admin/export?type=subscribers"
          >
            Xuất người đã xác nhận
          </Link>
        </div>
        <DataTable label="Đăng ký bản tin">
          <thead>
            <tr>
              <th>Email</th>
              <th>Ngôn ngữ</th>
              <th>Consent</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.email}</td>
                <td>{row.language}</td>
                <td>{dateLabel(row.consentAt)}</td>
                <td>
                  {row.unsubscribedAt
                    ? "Đã hủy"
                    : row.confirmedAt
                      ? "Đã xác nhận"
                      : "Chưa xác nhận"}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    );
  }
  if (sectionConfig.path === "email") {
    const jobs = await db.outbox.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    return (
      <div className="stack">
        <h1>Email & công việc nền</h1>
        <Alert>
          {process.env.MAIL_MODE === "local"
            ? "Adapter local ghi email vào .local/mail; LOCAL_CAPTURED chưa gửi ra Internet."
            : "Email gửi qua nhà cung cấp. SENT là nhà cung cấp đã nhận; kiểm tra hộp thư hoặc dashboard email để xác minh thư đến."}
        </Alert>
        <ActionButton
          action="worker.run"
          preset={{}}
          label="Xử lý công việc nền và email đang chờ"
        />
        <DataTable label="Outbox">
          <thead>
            <tr>
              <th>Gửi lúc</th>
              <th>Chủ đề</th>
              <th>Trạng thái</th>
              <th>Thử</th>
              <th>Kiểm tra / gửi lại</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{dateLabel(job.createdAt)}</td>
                <td>{job.subject}</td>
                <td>{job.status}</td>
                <td>{job.attempts}</td>
                <td>
                  {job.status === "FAILED" ? (
                    <ActionButton
                      action="email.retry"
                      preset={{ id: job.id }}
                      label="Thử gửi lại"
                    />
                  ) : (
                    <details>
                      <summary className="text-link">
                        Xem nội dung email (riêng tư)
                      </summary>
                      <p className="small">{job.recipient}</p>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {job.body}
                      </pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    );
  }
  if (sectionConfig.path === "tai-khoan") {
    const users = await db.adminUser.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        totpSecret: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return (
      <AccountPanel
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          active: u.isActive,
          totp: Boolean(u.totpSecret),
        }))}
        ownId={admin.id}
      />
    );
  }
  notFound();
}
