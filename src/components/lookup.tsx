"use client";
import { useState } from "react";
import { z } from "zod";
import { Button, Field, Alert, Badge } from "./ui";
import { postJson } from "@/lib/client-api";
import { dateLabel, money } from "@/lib/domain";
import { en, vi } from "@/i18n/messages";
import type { Locale } from "@/lib/content";
const resultSchema = z.object({
  code: z.string(),
  status: z.enum([
    "WAITLIST",
    "NEW",
    "CONFIRMED",
    "ATTENDED",
    "NO_SHOW",
    "CANCELLED",
  ]),
  title: z.string(),
  titleEn: z.string(),
  startsAt: z.string(),
  adults: z.number(),
  children: z.number(),
  totalAmount: z.number(),
  canCancel: z.boolean(),
  email: z.string(),
});
export function Lookup({
  locale,
  invite,
}: {
  locale: Locale;
  invite?: string;
}) {
  const t = (locale === "en" ? en : vi).workshop;
  const s = (locale === "en" ? en : vi).site;
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<z.infer<typeof resultSchema> | null>(
    null,
  );
  const [confirmCancel, setConfirmCancel] = useState(false);
  async function lookup() {
    setResult(
      resultSchema.parse(await postJson("/api/lookup", { code, phone })),
    );
  }
  async function action(kind: "cancel" | "accept") {
    setBusy(true);
    try {
      await postJson("/api/lookup", {
        action: kind,
        code,
        phone,
        token: invite,
      });
      setConfirmCancel(false);
      await lookup();
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.notFound);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="prose-width stack">
      <form
        className="panel stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            await lookup();
          } catch (error) {
            setResult(null);
            setMessage(error instanceof Error ? error.message : t.notFound);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>{t.codePhone}</p>
        <Field id="lookup-code" label={`${t.code} *`}>
          <input
            className="input"
            id="lookup-code"
            value={code}
            onChange={(e) => setCode(e.target.value.trim().toUpperCase())}
            placeholder="DH-MMDD-XXXX"
            required
            autoComplete="off"
          />
        </Field>
        <Field id="lookup-phone" label={`${s.phone} *`}>
          <input
            className="input"
            type="tel"
            id="lookup-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
          />
        </Field>
        <Button disabled={busy}>{busy ? s.loading : s.lookup}</Button>
      </form>
      {message && <Alert error>{message}</Alert>}
      {result && (
        <div className="panel stack">
          <h2>
            {locale === "en" ? result.titleEn || result.title : result.title}
          </h2>
          <Badge error={result.status === "CANCELLED"}>
            {t[result.status.toLowerCase() as keyof typeof t]}
          </Badge>
          <p>
            {result.code}
            <br />
            {dateLabel(result.startsAt, locale)}
            <br />
            {result.adults} {t.adults} + {result.children} {t.children}
            <br />
            {money(result.totalAmount, locale)}
            <br />
            {result.email}
          </p>
          {["NEW", "CONFIRMED"].includes(result.status) && (
            <Button
              variant="secondary"
              type="button"
              onClick={async () => {
                setBusy(true);
                try {
                  const response = await fetch("/api/lookup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code, phone, action: "ics" }),
                  });
                  if (!response.ok) throw new Error(t.notFound);
                  const url = URL.createObjectURL(await response.blob());
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "workshop.ics";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : t.notFound,
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t.calendar}
            </Button>
          )}
          {invite && result.status === "WAITLIST" && (
            <Button disabled={busy} onClick={() => action("accept")}>
              {locale === "en" ? "Accept invitation" : "Nhận lời mời giữ chỗ"}
            </Button>
          )}
          {result.canCancel && !confirmCancel && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
            >
              {s.cancel}
            </Button>
          )}
          {confirmCancel && (
            <div className="stack">
              <Alert>
                {locale === "en"
                  ? "Cancel this booking? Seats will be released."
                  : "Hủy đăng ký này? Chỗ đã giữ sẽ được giải phóng."}
              </Alert>
              <div className="flex">
                <Button disabled={busy} onClick={() => action("cancel")}>
                  {s.confirm}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmCancel(false)}
                >
                  {s.back}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
