"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Captcha } from "./captcha";
import { Alert, Button } from "./ui";
export function Newsletter({ locale }: { locale: string }) {
  const t = useTranslations("site");
  const [token, setToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setMessage("");
        try {
          const data = new FormData(form);
          const response = await fetch("/api/newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "subscribe",
              email: data.get("email"),
              language: locale,
              consent: data.get("consent") === "on",
              captcha: token,
              website: data.get("website"),
            }),
          });
          const result: unknown = await response.json();
          if (!response.ok)
            throw new Error(
              typeof result === "object" && result && "message" in result
                ? String(result.message)
                : "Không thể gửi / Unable to send",
            );
          setError(false);
          setMessage(
            locale === "en"
              ? "Request saved. Check the confirmation email before receiving newsletters."
              : "Đã lưu yêu cầu. Bạn cần xác nhận qua email trước khi nhận bản tin.",
          );
        } catch (err) {
          setError(true);
          setMessage(
            err instanceof Error ? err.message : "Mất kết nối / Offline",
          );
        } finally {
          setToken("");
          setCaptchaKey((n) => n + 1);
          setBusy(false);
        }
      }}
    >
      <div className="newsletter">
        <label className="sr-only" htmlFor="newsletter-email">
          Email
        </label>
        <input
          className="input"
          id="newsletter-email"
          type="email"
          name="email"
          placeholder={
            locale === "en" ? "Your email address" : "Địa chỉ email của bạn"
          }
          required
        />
        <Button disabled={busy || !token}>
          {busy ? t("loading") : t("newsletterSubmit")}
        </Button>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" name="consent" required />
        {locale === "en"
          ? "I agree to receive newsletters after confirming my email."
          : "Tôi đồng ý nhận bản tin sau khi xác nhận email."}
      </label>
      <label className="hidden-trap">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <Captcha key={captchaKey} locale={locale} onToken={setToken} />
      {message && <Alert error={error}>{message}</Alert>}
    </form>
  );
}
