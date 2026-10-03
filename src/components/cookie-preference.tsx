"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Alert } from "./ui";
import { postJson } from "@/lib/client-api";
import { localHref, type Locale } from "@/lib/links";
export function CookiePreference({
  locale,
  initial,
}: {
  locale: Locale;
  initial?: string;
}) {
  const [choice, setChoice] = useState(initial);
  const [open, setOpen] = useState(!initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const en = locale === "en";
  async function choose(value: "accepted" | "rejected") {
    setBusy(true);
    try {
      await postJson("/api/consent", { choice: value });
      setChoice(value);
      setOpen(false);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Offline");
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside
      className="cookie-preference"
      aria-label={
        en ? "Analytics cookie preferences" : "Tùy chọn cookie phân tích"
      }
    >
      <div className="container">
        {open ? (
          <div className="stack">
            <p>
              {en
                ? "We use an optional cookie to count video plays and avoid counting a browser twice within 30 minutes. You can refuse; videos still play."
                : "Cookie tùy chọn giúp đếm lượt phát video và tránh đếm lại một trình duyệt trong 30 phút. Bạn có thể từ chối và vẫn xem video."}{" "}
              <Link href={localHref(locale, "/chinh-sach-bao-mat")}>
                {en ? "Privacy policy" : "Chính sách bảo mật"}
              </Link>
            </p>
            <div className="flex wrap">
              <Button disabled={busy} onClick={() => choose("accepted")}>
                {en ? "Allow analytics" : "Cho phép phân tích"}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => choose("rejected")}
              >
                {en ? "Refuse analytics" : "Từ chối phân tích"}
              </Button>
            </div>
            {message && <Alert error>{message}</Alert>}
          </div>
        ) : (
          <button
            className="text-link cookie-trigger"
            onClick={() => setOpen(true)}
          >
            {en ? "Cookie preferences" : "Tùy chọn cookie"} ·{" "}
            {choice === "accepted"
              ? en
                ? "Analytics allowed"
                : "Đã cho phép phân tích"
              : en
                ? "Analytics refused"
                : "Đã từ chối phân tích"}
          </button>
        )}
      </div>
    </aside>
  );
}
