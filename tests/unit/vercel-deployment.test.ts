import { afterEach, describe, expect, it, vi } from "vitest";
import { productionGuard } from "../../src/lib/config";
import { cronAuthorized } from "../../src/lib/cron-auth";
import { cloudPrototype, localAdapters } from "../../src/lib/deployment";
import { migrationDatabaseUrl } from "../../src/lib/database-config";
import { sendResend } from "../../src/lib/services/mail";

describe("OPS-01/02, SEC-01/05 Vercel deployment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const cloud = () => {
    for (const [key, value] of Object.entries({
      VERCEL: "1",
      APP_MODE: "prototype",
      DEPLOYMENT_PROFILE: "vercel-prototype",
      DATABASE_URL:
        "postgresql://test:test@db.example.invalid/demo?sslmode=require",
      AUTH_SECRET: "a".repeat(40),
      CRON_SECRET: "b".repeat(40),
      PII_ENCRYPTION_KEY: "a".repeat(64),
      TURNSTILE_SECRET_KEY: "real-key-fixture",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "real-site-fixture",
      MEDIA_STORAGE: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "private-fixture",
      MAIL_MODE: "resend",
      RESEND_API_KEY: "re_fixture",
      MAIL_FROM: "demo@example.invalid",
      ADMIN_NOTIFY_EMAIL: "admin@example.invalid",
      SITE_URL: "https://demo.example.invalid",
    }))
      vi.stubEnv(key, value);
  };
  it("only the explicit cloud prototype may use cloud demo content; never filesystem adapters", () => {
    cloud();
    expect(cloudPrototype()).toBe(true);
    expect(localAdapters()).toBe(false);
    expect(productionGuard).not.toThrow();
    vi.stubEnv("MAIL_FROM", "Dong Ho <website@THAY_TEN_MIEN_GUI_MAIL>");
    expect(productionGuard).toThrow("MAIL_FROM");
    vi.stubEnv("MAIL_FROM", "demo@example.invalid");
    vi.stubEnv("DEPLOYMENT_PROFILE", "");
    expect(productionGuard).toThrow("durable production integrations");
  });
  it("cloud prototype requires real email, private storage and real CAPTCHA", () => {
    cloud();
    vi.stubEnv("MAIL_MODE", "local");
    expect(productionGuard).toThrow();
    vi.stubEnv("MAIL_MODE", "resend");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    expect(productionGuard).toThrow("Demo adapters");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "real-key-fixture");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "");
    expect(productionGuard).toThrow("private Vercel Blob");
  });
  it("the profile does not relax production malware scanner requirements", () => {
    cloud();
    vi.stubEnv("APP_MODE", "production");
    vi.stubEnv("SCANNER_COMMAND", "");
    expect(productionGuard).toThrow("SCANNER_COMMAND");
  });
  it("recognizes Neon's direct connection without changing explicit DIRECT_URL precedence", () => {
    const url =
      "postgresql://test:test@db.example.invalid/demo?sslmode=require";
    expect(
      migrationDatabaseUrl({ VERCEL: "1", DATABASE_URL_UNPOOLED: url }),
    ).toBe(url);
    expect(
      migrationDatabaseUrl({
        VERCEL: "1",
        DATABASE_URL_UNPOOLED: url,
        DIRECT_URL: url.replace("/demo", "/explicit"),
      }),
    ).toContain("/explicit");
  });
  it("cron refuses missing, short, wrong and absent credentials", () => {
    const secret = "a".repeat(40);
    expect(cronAuthorized(new Request("https://demo.invalid"), secret)).toBe(
      false,
    );
    expect(
      cronAuthorized(
        new Request("https://demo.invalid", {
          headers: { authorization: `Bearer ${secret}` },
        }),
        secret,
      ),
    ).toBe(true);
    expect(
      cronAuthorized(
        new Request("https://demo.invalid", {
          headers: { authorization: `Bearer ${"b".repeat(40)}` },
        }),
        secret,
      ),
    ).toBe(false);
    expect(cronAuthorized(new Request("https://demo.invalid"), "short")).toBe(
      false,
    );
  });
  it("Resend uses stable delivery idempotency and a real ICS attachment; rejection is not success", async () => {
    cloud();
    const mock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: "provider-id" }))
      .mockResolvedValueOnce(
        Response.json({ message: "private-address" }, { status: 403 }),
      );
    vi.stubGlobal("fetch", mock);
    const job = {
      id: "outbox-fixture",
      recipient: "guest@example.invalid",
      subject: "Workshop",
      body: "Saved booking",
      ics: "BEGIN:VCALENDAR\r\nEND:VCALENDAR",
    };
    await sendResend(job);
    const [, init] = mock.mock.calls[0];
    expect(init.headers["Idempotency-Key"]).toBe("dongho/outbox-fixture");
    expect(JSON.parse(init.body).attachments[0].content).toBe(
      Buffer.from(job.ics).toString("base64"),
    );
    await expect(sendResend(job)).rejects.toMatchObject({
      name: "ResendHTTP403",
    });
  });
});
