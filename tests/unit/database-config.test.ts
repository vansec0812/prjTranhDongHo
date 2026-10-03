import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { productionGuard } from "../../src/lib/config";
import {
  migrationDatabaseUrl,
  runtimeDatabaseUrl,
} from "../../src/lib/database-config";

const local = "postgresql://user:test@127.0.0.1:54329/dongho";
const pooled =
  "postgresql://user:test@pool.example.invalid:5432/dongho?sslmode=require&pgbouncer=true";
const direct =
  "postgresql://user:test@db.example.invalid:5432/dongho?sslmode=require";

describe("ENG-01 / ENG-23 / OPS-02 database environments", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses local prototype adapters on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("APP_MODE", "prototype");
    expect(productionGuard).toThrow("durable production integrations");
  });

  it.each([
    { VERCEL: "1" },
    { DIRECT_URL: direct },
    { DATABASE_URL: "private-password-invalid-url" },
  ])("local setup refuses hosted or invalid environment %j", (override) => {
    const result = spawnSync(process.execPath, ["scripts/setup-demo.mjs"], {
      encoding: "utf8",
      windowsHide: true,
      env: {
        ...process.env,
        APP_MODE: "prototype",
        VERCEL: "0",
        DATABASE_URL: local,
        DIRECT_URL: local,
        ...override,
      },
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(
      /only supports local|Invalid database config/,
    );
    expect(result.stderr).not.toContain("private-password-invalid-url");
  });
  it("keeps the existing local database and pool configuration", () => {
    expect(runtimeDatabaseUrl({ DATABASE_URL: local })).toBe(local);
    expect(migrationDatabaseUrl({ DATABASE_URL: local })).toBe(local);
  });

  it("separates runtime pooling from the migration connection", () => {
    const env = { DATABASE_URL: pooled, DIRECT_URL: direct, VERCEL: "1" };
    const runtime = new URL(runtimeDatabaseUrl(env));
    expect(runtime.hostname).toBe("pool.example.invalid");
    expect(runtime.searchParams.get("pgbouncer")).toBe("true");
    expect(runtime.searchParams.get("connection_limit")).toBe("1");
    expect(runtime.searchParams.get("connect_timeout")).toBe("15");
    expect(runtime.searchParams.get("pool_timeout")).toBe("15");
    expect(migrationDatabaseUrl(env)).toBe(direct);
  });

  it("preserves explicit pool sizes, timeouts and provider URL options", () => {
    const url = runtimeDatabaseUrl({
      VERCEL: "1",
      DATABASE_URL:
        direct + "&connection_limit=3&connect_timeout=20&pool_timeout=30",
    });
    expect(new URL(url).searchParams.get("connection_limit")).toBe("3");
    expect(new URL(url).searchParams.get("connect_timeout")).toBe("20");
    expect(new URL(url).searchParams.get("pool_timeout")).toBe("30");
    expect(new URL(url).searchParams.has("pgbouncer")).toBe(false);
  });

  it("supports legacy Vercel integration names without changing precedence", () => {
    const env = {
      VERCEL: "1",
      POSTGRES_PRISMA_URL: pooled,
      POSTGRES_URL_NON_POOLING: direct,
    };
    expect(new URL(runtimeDatabaseUrl(env)).hostname).toBe(
      "pool.example.invalid",
    );
    expect(migrationDatabaseUrl(env)).toBe(direct);
    expect(
      new URL(runtimeDatabaseUrl({ ...env, DATABASE_URL: direct })).hostname,
    ).toBe("db.example.invalid");
  });

  it.each(["localhost", "127.0.0.1", "127.0.0.2", "[::1]", "0.0.0.0"])(
    "rejects local host %s in Vercel functions",
    (host) => {
      expect(() =>
        runtimeDatabaseUrl({
          VERCEL: "1",
          DATABASE_URL: `postgresql://user:test@${host}/dongho?sslmode=require`,
        }),
      ).toThrow("hosted PostgreSQL");
    },
  );

  it("rejects remote connections without TLS and missing direct migrations", () => {
    expect(() =>
      runtimeDatabaseUrl({
        APP_MODE: "production",
        DATABASE_URL: direct.replace("sslmode=require", "sslmode=disable"),
      }),
    ).toThrow("TLS");
    expect(() =>
      migrationDatabaseUrl({ VERCEL: "1", DATABASE_URL: pooled }),
    ).toThrow("Missing DIRECT_URL");
    expect(() =>
      migrationDatabaseUrl({ VERCEL: "1", DIRECT_URL: pooled }),
    ).toThrow("direct or session");
  });

  it("does not expose credentials in errors for missing or malformed URLs", () => {
    expect(() => runtimeDatabaseUrl({})).toThrow("Missing database config");
    for (const invalid of [
      "very-private-password-not-a-url",
      "https://user:very-private-password@db.example.invalid/dongho",
    ]) {
      try {
        runtimeDatabaseUrl({ DATABASE_URL: invalid });
        expect.fail("Invalid URL must be rejected");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (!(error instanceof Error)) throw error;
        expect(error.message).not.toContain("very-private-password");
      }
    }
  });

  it.each(["0", "-1", "invalid"])("rejects pool limit %s", (limit) => {
    expect(() =>
      runtimeDatabaseUrl({
        DATABASE_URL: direct + `&connection_limit=${limit}`,
      }),
    ).toThrow("positive integer");
  });
});
