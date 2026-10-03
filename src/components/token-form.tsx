"use client";
import { useState } from "react";
import { postJson } from "@/lib/client-api";
import { Button, Field, Alert } from "./ui";
export function TokenForm({
  token,
  invite = false,
}: {
  token?: string;
  invite?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData(e.currentTarget);
        try {
          await postJson(
            "/api/admin-token",
            token
              ? {
                  action: invite ? "activate" : "reset",
                  token,
                  password: fd.get("password"),
                }
              : { action: "request-reset", email: fd.get("email") },
          );
          setMessage(
            token
              ? "Đã lưu mật khẩu. Bạn có thể đăng nhập."
              : "Nếu email phù hợp, hướng dẫn sẽ được đưa vào hàng đợi.",
          );
          setDone(true);
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "Không thể thực hiện.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {token ? (
        <Field id="token-password" label="Mật khẩu mới (ít nhất 12 ký tự)">
          <input
            className="input"
            id="token-password"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={200}
            required
          />
        </Field>
      ) : (
        <Field id="reset-email" label="Email admin">
          <input
            className="input"
            id="reset-email"
            type="email"
            name="email"
            required
          />
        </Field>
      )}
      <Button disabled={busy || done}>
        {busy ? "Đang xử lý…" : token ? "Lưu mật khẩu" : "Gửi hướng dẫn"}
      </Button>
      {message && <Alert>{message}</Alert>}
    </form>
  );
}
