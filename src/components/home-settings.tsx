"use client";
import { useState } from "react";
import type { SiteSettings } from "@/lib/config";
import { postJson } from "@/lib/client-api";
import { Button, Field, Alert } from "./ui";
export function HomeSettings({
  initial,
  paintings,
}: {
  initial: SiteSettings;
  paintings: Array<{ id: string; title: string }>;
}) {
  const [stats, setStats] = useState(() =>
    Array.from(
      { length: 4 },
      (_, i) => initial.stats[i] ?? { value: "", labelVi: "", labelEn: "" },
    ),
  );
  const [ids, setIds] = useState(() =>
    Array.from({ length: 3 }, (_, i) => initial.heroPaintingIds[i] ?? ""),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  return (
    <form
      className="panel stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await postJson("/api/admin", {
            action: "settings.home",
            stats: stats.filter((s) => s.value.trim() || s.labelVi.trim()),
            heroPaintingIds: ids.filter(Boolean),
          });
          setError(false);
          setMessage("Đã lưu số liệu và cụm tranh trang chủ.");
        } catch (error) {
          setError(true);
          setMessage(
            error instanceof Error
              ? error.message
              : "Không thể lưu. Nội dung nhập vẫn được giữ.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Số liệu trang chủ</h2>
      <p className="meta">
        Nhập 3–4 số liệu đã xác minh. Để trống cả bốn dòng nếu chưa có dữ liệu.
        Dữ liệu minh họa phải có nhãn phù hợp.
      </p>
      {stats.map((stat, i) => (
        <fieldset key={i} className="grid-3">
          <legend className="field-label">Số liệu {i + 1}</legend>
          {(["value", "labelVi", "labelEn"] as const).map((key) => (
            <Field
              key={key}
              id={`stat-${i}-${key}`}
              label={
                { value: "Giá trị", labelVi: "Nhãn VI", labelEn: "Nhãn EN" }[
                  key
                ]
              }
            >
              <input
                id={`stat-${i}-${key}`}
                className="input"
                value={stat[key]}
                maxLength={key === "value" ? 20 : 80}
                onChange={(e) =>
                  setStats((list) =>
                    list.map((s, n) =>
                      n === i ? { ...s, [key]: e.target.value } : s,
                    ),
                  )
                }
              />
            </Field>
          ))}
        </fieldset>
      ))}
      <h2>Cụm ba tranh hero</h2>
      <p className="meta">
        Chọn đúng ba tranh đã xuất bản; để trống cả ba để lấy ba tranh đầu tiên
        trong thư viện. Tranh nháp/ẩn không được đưa ra public.
      </p>
      {ids.map((id, i) => (
        <Field key={i} id={`hero-art-${i}`} label={`Tranh ${i + 1}`}>
          <select
            id={`hero-art-${i}`}
            value={id}
            onChange={(e) =>
              setIds((list) =>
                list.map((value, n) => (n === i ? e.target.value : value)),
              )
            }
          >
            <option value="">Theo thư viện</option>
            {paintings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
      ))}
      {message && <Alert error={error}>{message}</Alert>}
      <Button disabled={busy}>{busy ? "Đang lưu…" : "Lưu trang chủ"}</Button>
    </form>
  );
}
