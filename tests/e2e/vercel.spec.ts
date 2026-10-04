import "dotenv/config";
import { test, expect } from "@playwright/test";

test("OPS-01/SEC-01 · cron authenticates on HTTP and returns only job counts", async ({
  request,
  baseURL,
}) => {
  if (
    new URL(baseURL ?? "").hostname !== "127.0.0.1" ||
    process.env.APP_MODE !== "prototype"
  )
    throw new Error(
      "This scheduler test requires the isolated local prototype",
    );
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Local cron credential missing");
  const denied = await request.get("/api/cron");
  expect(denied.status()).toBe(401);
  expect(denied.headers()["cache-control"]).toBe("no-store");
  const wrong = await request.get("/api/cron", {
    headers: { Authorization: `Bearer ${"x".repeat(40)}` },
  });
  expect(wrong.status()).toBe(401);
  for (let run = 0; run < 2; run++) {
    const accepted = await request.get("/api/cron", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(accepted.status()).toBe(200);
    expect(accepted.headers()["cache-control"]).toBe("no-store");
    const body = await accepted.json();
    expect(Object.keys(body).sort()).toEqual(
      ["anonymized", "processed"].sort(),
    );
    expect(
      Object.values(body).every(
        (value) => typeof value === "number" && value >= 0,
      ),
    ).toBe(true);
  }
  const guest = await request.post("/api/admin", {
    data: { action: "worker.run" },
  });
  expect(guest.status()).toBe(401);
});

test("NFR-09 · readiness checks schema without exposing database details", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({
    status: "ready",
    mode: "prototype",
    at: expect.any(String),
  });
});
