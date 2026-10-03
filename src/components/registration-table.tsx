"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { DataTable, Button, Alert, Badge } from "./ui";
import { ActionButton, ActionForm } from "./admin-actions";
import { postJson } from "@/lib/client-api";
import { money } from "@/lib/domain";
type Row = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  session: string;
  adults: number;
  children: number;
  total: number;
  status: string;
  createdAt: string;
  note: string;
};
const resultSchema = z.object({
  results: z.array(
    z.object({ id: z.string(), ok: z.boolean(), error: z.string().optional() }),
  ),
});
export function RegistrationTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("CONFIRMED");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="stack">
      <div className="panel stack">
        <p>
          <strong>{selected.length}</strong> mục đã chọn
        </p>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="bulk-status">Đổi trạng thái</label>
            <select
              id="bulk-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setConfirmed(false);
              }}
            >
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="ATTENDED">Đã tham gia</option>
              <option value="NO_SHOW">Vắng mặt</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bulk-reason">Lý do hủy (bắt buộc khi hủy)</label>
            <input
              className="input"
              id="bulk-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
            />
          </div>
          <div className="field">
            <span className="field-label">
              Áp dụng cho {selected.length} mục
            </span>
            <Button
              disabled={
                busy ||
                !selected.length ||
                (status === "CANCELLED" && (!confirmed || !reason.trim()))
              }
              onClick={async () => {
                setBusy(true);
                try {
                  const result = resultSchema.parse(
                    await postJson("/api/admin", {
                      action: "registration.status",
                      ids: selected,
                      status,
                      reason,
                    }),
                  );
                  setMessage(
                    result.results
                      .map(
                        (r) =>
                          `${rows.find((row) => row.id === r.id)?.code ?? r.id}: ${r.ok ? "Đã cập nhật" : r.error}`,
                      )
                      .join("\n"),
                  );
                  router.refresh();
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Không thể cập nhật.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Đang xử lý…" : "Áp dụng"}
            </Button>
          </div>
        </div>
        {status === "CANCELLED" && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Xác nhận hủy {selected.length} đăng ký; giải phóng chỗ đã giữ.
          </label>
        )}
        {message && <Alert>{message}</Alert>}
        <p className="meta">
          Mỗi mục được kiểm tra chuyển trạng thái riêng. Không khôi phục trạng
          thái cuối; điểm danh chỉ khi tới giờ học.
        </p>
      </div>
      <DataTable label="Danh sách đăng ký workshop">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                aria-label="Chọn tất cả trên trang"
                checked={rows.length > 0 && selected.length === rows.length}
                onChange={(e) =>
                  setSelected(e.target.checked ? rows.map((r) => r.id) : [])
                }
              />
            </th>
            <th>Mã / Buổi</th>
            <th>Khách / SĐT</th>
            <th>Người</th>
            <th>Tạm tính</th>
            <th>Gửi lúc</th>
            <th>Trạng thái / Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Chọn ${row.code}`}
                  checked={selected.includes(row.id)}
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked
                        ? [...ids, row.id]
                        : ids.filter((id) => id !== row.id),
                    )
                  }
                />
              </td>
              <td>
                <strong>{row.code}</strong>
                <br />
                {row.session}
              </td>
              <td>
                {row.fullName}
                <br />
                {row.phone}
              </td>
              <td>
                {row.adults} + {row.children}
              </td>
              <td>{money(row.total)}</td>
              <td>{row.createdAt}</td>
              <td>
                <div className="stack">
                  <Badge error={row.status === "CANCELLED"}>{row.status}</Badge>
                  {row.status === "NEW" && (
                    <ActionButton
                      action="registration.status"
                      preset={{ ids: [row.id], status: "CONFIRMED" }}
                      label="Xác nhận"
                      secondary={false}
                    />
                  )}
                  <details>
                    <summary className="text-link">Chi tiết & ghi chú</summary>
                    <div className="stack">
                      <ActionForm
                        action="registration.note"
                        preset={{ id: row.id }}
                        fields={[
                          {
                            name: "note",
                            label: "Ghi chú nội bộ (không xuất CSV)",
                            type: "textarea",
                            value: row.note,
                          },
                        ]}
                      />
                      <ActionButton
                        action="registration.resend"
                        preset={{ id: row.id }}
                        label="Đưa email vào hàng đợi"
                      />
                    </div>
                  </details>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      {!rows.length && <p>Chưa có đăng ký phù hợp.</p>}
    </div>
  );
}
