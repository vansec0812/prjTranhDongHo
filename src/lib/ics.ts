import { dateLabel } from "./domain";
function escape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
function utc(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
export function calendarFile(
  registration: { id: string; code: string; status: string },
  session: { startsAt: Date; endsAt: Date },
  title: string,
  location: string,
) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dong Ho//Workshop//VI",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${registration.id}@dongho.local`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(session.startsAt)}`,
    `DTEND:${utc(session.endsAt)}`,
    `SUMMARY:${escape(title)}`,
    `DESCRIPTION:${escape(`${registration.code} • ${dateLabel(session.startsAt)}`)}`,
    `LOCATION:${escape(location)}`,
    `STATUS:${registration.status === "CANCELLED" ? "CANCELLED" : registration.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
