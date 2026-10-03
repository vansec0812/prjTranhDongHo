"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { z } from "zod";
import { Minus, Plus, Check, ArrowLeft } from "lucide-react";
import type { Locale } from "@/lib/links";
import { localHref } from "@/lib/links";
import type { PublicSession } from "@/lib/sessions";
import { money, totalPrice } from "@/lib/domain";
import { ClientError, postJson, focusError } from "@/lib/client-api";
import { en, vi } from "@/i18n/messages";
import { Captcha } from "./captcha";
import { Button, Field, Alert, ButtonLink } from "./ui";
const resultSchema = z.object({ code: z.string(), status: z.string() });
function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="stepper">
        <button
          type="button"
          aria-label={`− ${label}`}
          disabled={value === 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus size={16} />
        </button>
        <output aria-live="polite" aria-label={label}>
          {value}
        </output>
        <button
          type="button"
          aria-label={`+ ${label}`}
          disabled={value >= 1000}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
export function Booking({
  sessions,
  locale,
  selectedId,
  priceAdult,
  priceChild,
  bank,
  cancelHours,
}: {
  sessions: PublicSession[];
  locale: Locale;
  selectedId?: string;
  priceAdult: number;
  priceChild: number;
  bank: string;
  cancelHours: number;
}) {
  const t = (locale === "en" ? en : vi).workshop;
  const s = (locale === "en" ? en : vi).site;
  const form = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  useEffect(() => {
    if (step > 1 && matchMedia("(max-width:767px)").matches)
      form.current
        ?.querySelector(".booking-step.is-active")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [step]);
  const [sessionId, setSession] = useState(
    selectedId && sessions.some((s) => s.id === selectedId)
      ? selectedId
      : (sessions.find((s) => s.status === "OPEN")?.id ?? ""),
  );
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [token, setToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<z.infer<typeof resultSchema> | null>(
    null,
  );
  const session = sessions.find((s) => s.id === sessionId);
  const total = totalPrice(adults, children, priceAdult, priceChild);
  const advance = () => {
    if (step === 1) {
      if (session?.status !== "OPEN") {
        setMessage(t.closed);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.current?.reportValidity()) return;
      if (adults + children < 1) {
        setMessage(
          locale === "en"
            ? "Add at least one participant."
            : "Cần ít nhất một người tham gia.",
        );
        return;
      }
      setStep(3);
      setMessage("");
    }
  };
  if (result)
    return (
      <div className="panel stack" role="status">
        <Check size={32} aria-hidden="true" />
        <h2>{result.status === "WAITLIST" ? t.waitlist : t.received}</h2>
        <p>{result.status === "WAITLIST" ? t.waitlistText : t.receivedText}</p>
        <div>
          <p className="eyebrow">{t.code}</p>
          <h3>{result.code}</h3>
        </div>
        <p>
          {locale === "en" ? session?.labelEn : session?.labelVi} ·{" "}
          {adults + children} {locale === "en" ? "people" : "người"}
        </p>
        <p>{bank}</p>
        <div className="flex wrap">
          <ButtonLink href={localHref(locale, "/workshop/tra-cuu")}>
            {s.lookup}
          </ButtonLink>
          <ButtonLink href={localHref(locale, "/tham-quan")} secondary>
            {s.visit}
          </ButtonLink>
        </div>
      </div>
    );
  return (
    <form
      ref={form}
      className="panel stack booking"
      id="dang-ky"
      onSubmit={async (e) => {
        e.preventDefault();
        if (step < 3) {
          advance();
          return;
        }
        setBusy(true);
        setMessage("");
        setErrors({});
        const fd = new FormData(e.currentTarget);
        try {
          const data = {
            sessionId,
            fullName: fd.get("fullName"),
            phone: fd.get("phone"),
            email: fd.get("email"),
            language: fd.get("language"),
            note: fd.get("note"),
            website: fd.get("website"),
            consent: fd.get("consent") === "on",
            adults,
            children,
            captcha: token,
            idempotencyKey,
          };
          const r = resultSchema.parse(
            await postJson("/api/registration", data),
          );
          setResult(r);
        } catch (error) {
          setToken("");
          setCaptchaKey((n) => n + 1);
          setMessage(
            error instanceof Error ? error.message : "Mất kết nối / Offline",
          );
          if (error instanceof ClientError) {
            setErrors(error.fields);
            setStep(2);
            if (form.current)
              setTimeout(() => focusError(form.current!, error.fields), 0);
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{locale === "en" ? "Book your place" : "Giữ chỗ"}</h2>
      <div
        className="steps"
        aria-label={locale === "en" ? "Booking steps" : "Các bước đăng ký"}
      >
        {[t.choose, t.info, t.review].map((label, i) => (
          <span
            key={label}
            className={step >= i + 1 ? "active" : ""}
            aria-current={step === i + 1 ? "step" : undefined}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>
      <div className={`stack booking-step ${step === 1 ? "is-active" : ""}`}>
        <fieldset className="stack">
          <legend className="field-label">{t.choose} *</legend>
          {sessions.map((s) => (
            <label className="session-option" key={s.id}>
              <input
                type="radio"
                name="sessionId"
                value={s.id}
                checked={sessionId === s.id}
                disabled={s.status !== "OPEN"}
                onChange={() => setSession(s.id)}
              />
              <span>
                <strong className="small">
                  {locale === "en" ? s.labelEn : s.labelVi}
                </strong>
                <br />
                <span className="meta">
                  {s.language === "en" ? "English" : "Tiếng Việt"} ·{" "}
                  {s.status !== "OPEN"
                    ? t.closed
                    : s.available > 0
                      ? `${s.available} ${t.seats}`
                      : t.full}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className={`stack booking-step ${step === 2 ? "is-active" : ""}`}>
        <Field
          id="booking-name"
          label={`${s.name} *`}
          error={errors.fullName?.[0]}
        >
          <input
            className="input"
            id="booking-name"
            name="fullName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={
              errors.fullName ? "booking-name-error" : undefined
            }
          />
        </Field>
        <div className="grid-2">
          <Field
            id="booking-phone"
            label={`${s.phone} *`}
            error={errors.phone?.[0]}
          >
            <input
              className="input"
              id="booking-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={40}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={
                errors.phone ? "booking-phone-error" : undefined
              }
            />
          </Field>
          <Field
            id="booking-email"
            label={`${s.email} *`}
            error={errors.email?.[0]}
          >
            <input
              className="input"
              id="booking-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "booking-email-error" : undefined
              }
            />
          </Field>
        </div>
        <div className="grid-2">
          <Counter label={t.adults} value={adults} onChange={setAdults} />
          <Counter label={t.children} value={children} onChange={setChildren} />
        </div>
        {children > 0 && <Alert>{t.warning}</Alert>}
        {adults + children > 15 && (
          <Link
            className="text-link"
            href={localHref(locale, "/lien-he?chu-de=group")}
          >
            {s.group}
          </Link>
        )}
        <Field id="booking-language" label={t.language}>
          <select id="booking-language" name="language" defaultValue={locale}>
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </Field>
        <Field id="booking-note" label={s.note}>
          <textarea id="booking-note" name="note" maxLength={1000} />
        </Field>
        <label className="checkbox-label">
          <input name="consent" type="checkbox" required />
          <span>
            {t.consent}{" "}
            <Link href={localHref(locale, "/chinh-sach-bao-mat")}>
              {s.privacy}
            </Link>
          </span>
        </label>
      </div>
      <div className={`stack booking-step ${step === 3 ? "is-active" : ""}`}>
        <div>
          <h3>
            {locale === "en" ? "Review your booking" : "Kiểm tra đăng ký"}
          </h3>
          <p>
            {locale === "en" ? session?.labelEn : session?.labelVi} · {adults}{" "}
            {t.adults.toLowerCase()} + {children} {t.children.toLowerCase()}
          </p>
          <p className="small">
            {t.cancelPolicy.replace("{hours}", String(cancelHours))}
          </p>
          <p className="small">{bank}</p>
          {session && session.available < adults + children && (
            <Alert>{t.waitlistText}</Alert>
          )}
        </div>
        <Captcha eager key={captchaKey} locale={locale} onToken={setToken} />
        {!token && (
          <p className="meta">
            {locale === "en"
              ? "Complete spam protection to send your booking."
              : "Hoàn tất kiểm tra chống spam để gửi đăng ký."}
          </p>
        )}
      </div>
      <label className="hidden-trap">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {message && <Alert error>{message}</Alert>}
      <div className="booking-summary">
        <div>
          <span className="meta">{t.total}</span>
          <br />
          <strong>{money(total, locale)}</strong>
        </div>
        <div className="flex">
          {step > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} />
              {s.back}
            </Button>
          )}
          {step < 3 ? (
            <Button type="button" onClick={advance}>
              {s.next}
            </Button>
          ) : (
            <Button type="submit" disabled={busy || !token || !sessionId}>
              {busy ? s.loading : t.send}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
