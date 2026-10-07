import { describe, expect, it } from "vitest";
import { databaseStartupError } from "../../scripts/database-startup-error.mjs";

describe("local database startup diagnostics", () => {
  it("reports the actual startup failure and exit status", () => {
    const error = databaseStartupError(
      "initdb: error: permission denied\nprocess exited",
      {},
      1,
    );
    expect(error.message).toContain("exit code: 1");
    expect(error.message).toContain("initdb: error: permission denied");
  });

  it("redacts URL credentials, encoded passwords and private keys", () => {
    const password = "private pass!";
    const encoded = encodeURIComponent(password);
    const url = `postgresql://user:${encoded}@127.0.0.1:54329/dongho`;
    const error = databaseStartupError(
      `error: ${url}\n${password}\n${encoded}\nprivate-auth-value\nAPI_KEY=unknown-provider-value`,
      { DATABASE_URL: url, AUTH_SECRET: "private-auth-value" },
      1,
    );
    for (const secret of [
      password,
      encoded,
      url,
      "private-auth-value",
      "unknown-provider-value",
    ])
      expect(error.message).not.toContain(secret);
    expect(error.message).toContain("[REDACTED]");
  });
});
