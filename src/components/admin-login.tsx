"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field } from "./ui";
export function AdminLogin() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        const data = new FormData(e.currentTarget);
        try {
          const result = await signIn("credentials", {
            email: data.get("email"),
            password: data.get("password"),
            totp: data.get("totp"),
            redirect: false,
          });
          if (result?.error)
            throw new Error(
              "Thông tin đăng nhập không hợp lệ hoặc tài khoản tạm khóa.",
            );
          router.push("/admin");
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Không thể đăng nhập. Hãy thử lại.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field id="login-email" label="Email *">
        <input
          className="input"
          type="email"
          id="login-email"
          name="email"
          required
          autoComplete="username"
        />
      </Field>
      <Field id="login-password" label="Mật khẩu *">
        <input
          className="input"
          type="password"
          id="login-password"
          name="password"
          required
          autoComplete="current-password"
        />
      </Field>
      <Field id="login-totp" label="Mã 2FA (nếu đã bật)">
        <input
          className="input"
          id="login-totp"
          name="totp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
        />
      </Field>
      {message && <Alert error>{message}</Alert>}
      <Button disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</Button>
    </form>
  );
}
