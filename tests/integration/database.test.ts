import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("ENG-23 direct migration connection", () => {
  it("Prisma CLI uses DIRECT_URL even when the runtime DB is unreachable", () => {
    const runtime = new URL(process.env.DATABASE_URL ?? "");
    runtime.port = "1";
    const result = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "status"],
      {
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env, DATABASE_URL: runtime.toString() },
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Database schema is up to date");
  });
});
