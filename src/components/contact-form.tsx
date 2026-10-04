"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/links";
import { localHref } from "@/lib/links";
import { en, vi } from "@/i18n/messages";
import { ClientError, focusError } from "@/lib/client-api";
import { Alert, Button, Field } from "./ui";
import { Captcha } from "./captcha";
import { z } from "zod";
import { prepareCloudImage } from "@/lib/prepare-image";
const errorSchema = z.object({
  message: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});
export function ContactForm({
  locale,
  topic = "faq",
  painting,
  artisanId,
}: {
  locale: Locale;
  topic?: string;
  painting?: { id: string; title: string };
  artisanId?: string;
}) {
  const t = (locale === "en" ? en : vi).contact;
  const s = (locale === "en" ? en : vi).site;
  const [token, setToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const form = useRef<HTMLFormElement>(null);
  if (sent)
    return (
      <div className="panel stack">
        <h2>{t.sent}</h2>
        <p role="status">{t.sentText}</p>
      </div>
    );
  return (
    <form
      ref={form}
      className="panel stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        setErrors({});
        const fd = new FormData(e.currentTarget);
        const input = {
          fullName: fd.get("fullName"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          message: fd.get("message"),
          topic: fd.get("topic"),
          consent: fd.get("consent") === "on",
          website: fd.get("website"),
          captcha: token,
          language: locale,
          paintingId: painting?.id,
          artisanId,
        };
        fd.set("data", JSON.stringify(input));
        try {
          if (
            process.env.NEXT_PUBLIC_DEPLOYMENT_PROFILE === "vercel-prototype"
          ) {
            const files = fd
              .getAll("attachments")
              .filter(
                (value): value is File =>
                  value instanceof File && value.size > 0,
              );
            if (files.length > 3)
              throw new Error("Tối đa 3 ảnh / Maximum 3 images");
            fd.delete("attachments");
            for (const file of files)
              fd.append("attachments", await prepareCloudImage(file));
          }
          const response = await fetch("/api/contact", {
            method: "POST",
            body: fd,
          });
          const result: unknown = await response.json();
          if (!response.ok) {
            const parsed = errorSchema.safeParse(result);
            throw new ClientError(
              parsed.success
                ? (parsed.data.message ?? "Không thể gửi / Unable to send")
                : "Không thể gửi / Unable to send",
              parsed.success ? (parsed.data.fields ?? {}) : {},
            );
          }
          setSent(true);
        } catch (error) {
          setToken("");
          setCaptchaKey((n) => n + 1);
          setMessage(
            error instanceof Error ? error.message : "Mất kết nối / Offline",
          );
          if (error instanceof ClientError) {
            setErrors(error.fields);
            if (form.current) focusError(form.current, error.fields);
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{t.title}</h2>
      <Field id="contact-topic" label={`${t.topic} *`}>
        <select
          id="contact-topic"
          name="topic"
          defaultValue={
            [
              "faq",
              "painting",
              "education",
              "group",
              "press",
              "other",
            ].includes(topic)
              ? topic
              : "faq"
          }
        >
          {(
            ["faq", "painting", "education", "group", "press", "other"] as const
          ).map((key) => (
            <option key={key} value={key}>
              {t[key]}
            </option>
          ))}
        </select>
      </Field>
      {painting && (
        <p className="small">
          {t.reference}: <strong>{painting.title}</strong>
        </p>
      )}
      <Field
        id="contact-name"
        label={`${s.name} *`}
        error={errors.fullName?.[0]}
      >
        <input
          className="input"
          id="contact-name"
          name="fullName"
          minLength={2}
          maxLength={80}
          required
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? "contact-name-error" : undefined}
        />
      </Field>
      <div className="grid-2">
        <Field
          id="contact-email"
          label={`${s.email} *`}
          error={errors.email?.[0]}
        >
          <input
            className="input"
            type="email"
            id="contact-email"
            name="email"
            maxLength={200}
            required
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
          />
        </Field>
        <Field
          id="contact-phone"
          label={`${s.phone} *`}
          error={errors.phone?.[0]}
        >
          <input
            className="input"
            type="tel"
            id="contact-phone"
            name="phone"
            maxLength={40}
            required
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "contact-phone-error" : undefined}
          />
        </Field>
      </div>
      <Field
        id="contact-message"
        label={`${t.message} *`}
        error={errors.message?.[0]}
      >
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={20}
          maxLength={2000}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={
            errors.message ? "contact-message-error" : undefined
          }
        />
      </Field>
      <Field id="contact-files" label={t.attachments}>
        <input
          className="input"
          id="contact-files"
          name="attachments"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
        />
        <span className="meta">{t.attachmentLimit}</span>
      </Field>
      <label className="checkbox-label">
        <input type="checkbox" name="consent" required />
        <span>
          {t.consent}{" "}
          <Link href={localHref(locale, "/chinh-sach-bao-mat")}>
            {s.privacy}
          </Link>
        </span>
      </label>
      <label className="hidden-trap">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <Captcha eager key={captchaKey} locale={locale} onToken={setToken} />
      {!token && (
        <p className="meta">
          {locale === "en"
            ? "Complete spam protection to send your message."
            : "Hoàn tất kiểm tra chống spam để gửi lời nhắn."}
        </p>
      )}
      {message && <Alert error>{message}</Alert>}
      <Button disabled={busy || !token}>{busy ? s.loading : t.send}</Button>
    </form>
  );
}
