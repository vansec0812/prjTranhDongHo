"use client";
import { useState } from "react";
import { postJson } from "@/lib/client-api";
import { Alert, Button } from "./ui";
export function NewsletterConfirm({
  token,
  action,
  locale,
}: {
  token: string;
  action: string;
  locale: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="panel stack">
      <p>
        {locale === "en"
          ? "Confirm your newsletter preference."
          : "Xác nhận lựa chọn nhận bản tin của bạn."}
      </p>
      <Button
        disabled={busy || done || !token}
        onClick={async () => {
          setBusy(true);
          try {
            await postJson("/api/newsletter", { token, action });
            setDone(true);
            setError(false);
            setMessage(
              locale === "en"
                ? "Your preference has been saved."
                : "Đã lưu lựa chọn của bạn.",
            );
          } catch (err) {
            setError(true);
            setMessage(
              err instanceof Error
                ? err.message
                : "Không thể thực hiện / Unable to save",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {action === "unsubscribe"
          ? locale === "en"
            ? "Unsubscribe"
            : "Hủy nhận bản tin"
          : locale === "en"
            ? "Confirm subscription"
            : "Xác nhận đăng ký"}
      </Button>
      {message && <Alert error={error}>{message}</Alert>}
    </div>
  );
}
