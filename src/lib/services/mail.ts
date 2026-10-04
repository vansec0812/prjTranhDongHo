import { z } from "zod";

export async function sendResend(job: {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  ics: string | null;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM)
    throw new Error("Resend not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `dongho/${job.id}`,
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [job.recipient],
      subject: job.subject,
      text: job.body,
      ...(job.ics
        ? {
            attachments: [
              {
                filename: "workshop.ics",
                content: Buffer.from(job.ics).toString("base64"),
                content_type: "text/calendar",
              },
            ],
          }
        : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    // Never persist provider response bodies: they may contain addresses or tokens.
    const error = new Error("Mail provider rejected delivery");
    error.name = `ResendHTTP${response.status}`;
    throw error;
  }
  const accepted = z
    .object({ id: z.string().min(1) })
    .safeParse(await response.json());
  if (!accepted.success)
    throw new Error("Invalid mail provider acknowledgement");
}
