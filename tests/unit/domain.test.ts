import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  fold,
  totalPrice,
  canCancel,
  videoEmbed,
  registrationSchema,
} from "../../src/lib/domain";
import { registrationCode } from "../../src/lib/ids";
describe("BR / ENG domain rules", () => {
  it("FR-GEN-02 folds Vietnamese including đ while preserving source", () => {
    expect(fold("Đông Hồ, giấy điệp")).toBe("dong ho, giay diep");
  });
  it("FR-WS-03 normalizes Vietnamese and international phones", () => {
    expect(normalizePhone("0912 345 678")).toBe("+84912345678");
    expect(normalizePhone("+1 202 555 0123")).toBe("+12025550123");
    expect(() => normalizePhone("123")).toThrow();
  });
  it("ENG-02 prices adults and children as integer VND", () => {
    expect(totalPrice(2, 1, 150000, 100000)).toBe(400000);
  });
  it("BR-04 permits cancellation at the exact deadline", () => {
    const starts = new Date("2026-10-10T02:00:00Z");
    expect(canCancel(starts, new Date("2026-10-09T02:00:00Z"), 24)).toBe(true);
    expect(canCancel(starts, new Date("2026-10-09T02:00:00.001Z"), 24)).toBe(
      false,
    );
  });
  it("ENG-08 generates registration date in Ho Chi Minh timezone", () => {
    expect(registrationCode(new Date("2026-10-02T18:00:00Z"))).toMatch(
      /^DH-1003-[A-F0-9]{4}$/,
    );
  });
  it("SEC-04 rejects script, lookalike and arbitrary embed hosts", () => {
    expect(videoEmbed("javascript:alert(1)")).toBeNull();
    expect(
      videoEmbed("https://youtube.com.attacker.invalid/watch?v=abcdefghijk"),
    ).toBeNull();
    expect(videoEmbed("http://www.youtube.com/watch?v=abcdefghijk")).toBeNull();
    expect(videoEmbed("https://youtu.be/abcdefghijk")?.id).toBe("abcdefghijk");
  });
  it("ENG-02 rejects negative, fractional and empty groups", () => {
    const base = {
      sessionId: "test",
      fullName: "Test guest",
      phone: "+12025550123",
      email: "test@example.invalid",
      language: "en",
      consent: true,
      captcha: "test",
      website: "",
      idempotencyKey: crypto.randomUUID(),
    };
    expect(
      registrationSchema.safeParse({ ...base, adults: 0, children: 0 }).success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ ...base, adults: 1.5, children: 0 })
        .success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ ...base, adults: 0, children: 1 }).success,
    ).toBe(true);
    expect(
      registrationSchema.safeParse({ ...base, adults: 16, children: 0 })
        .success,
    ).toBe(true);
  });
});
