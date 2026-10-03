import { randomBytes, createHash } from "node:crypto";
export function registrationCode(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `DH-${month}${day}-${randomBytes(3).toString("hex").slice(0, 4).toUpperCase()}`;
}
export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
