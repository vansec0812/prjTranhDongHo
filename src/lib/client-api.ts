import { z } from "zod";
const errorSchema = z.object({
  message: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});
export class ClientError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export async function postJson(path: string, data: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const error = errorSchema.safeParse(result);
    throw new ClientError(
      error.success
        ? (error.data.message ?? "Không thể thực hiện / Action unavailable")
        : "Không thể thực hiện / Action unavailable",
      error.success ? (error.data.fields ?? {}) : {},
    );
  }
  return result;
}
export function focusError(
  form: HTMLFormElement,
  fields: Record<string, string[]>,
) {
  const key = Object.keys(fields)[0];
  const element = key ? form.elements.namedItem(key) : null;
  if (element instanceof HTMLElement) element.focus();
}
