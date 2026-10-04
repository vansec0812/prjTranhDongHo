import { expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lib/password";
it("SEC-02 Argon2id preserves PHC parameters, random salts and correct verification", async () => {
  const password = "test-password-with-Vietnamese-đông-hồ";
  const first = await hashPassword(password),
    second = await hashPassword(password);
  expect(first).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
  expect(first).not.toBe(second);
  expect(await verifyPassword(first, password)).toBe(true);
  expect(
    await verifyPassword(
      first.replace("m=65536,t=3,p=1", "m=65536,p=1,t=3"),
      password,
    ),
  ).toBe(true);
  expect(
    await verifyPassword(
      first.replace("m=65536,t=3,p=1", "m=65536,p=1,p=3"),
      password,
    ),
  ).toBe(false);
  expect(await verifyPassword(first, "wrong-password")).toBe(false);
  expect(
    await verifyPassword(first.replace("m=65536", "m=4294967295"), password),
  ).toBe(false);
  expect(await verifyPassword("plain-text", password)).toBe(false);
});
