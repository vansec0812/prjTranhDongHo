"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client-api";
import { Alert, Button, Field } from "./ui";
export type ActionField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "number"
    | "password"
    | "textarea"
    | "select"
    | "checkbox";
  value?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
};
export function ActionForm({
  action,
  preset = {},
  fields,
  label = "Lưu",
  endpoint = "/api/admin",
  nested = false,
  confirm = false,
}: {
  action: string;
  preset?: Record<string, unknown>;
  fields: ActionField[];
  label?: string;
  endpoint?: string;
  nested?: boolean;
  confirm?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (confirm && !confirmed) {
          setMessage(
            "Thao tác này thay đổi trạng thái hoặc ẩn dữ liệu. Chọn xác nhận để tiếp tục.",
          );
          return;
        }
        setBusy(true);
        setMessage("");
        const fd = new FormData(e.currentTarget);
        const values: Record<string, unknown> = { ...preset };
        for (const field of fields) {
          values[field.name] =
            field.type === "number"
              ? Number(fd.get(field.name))
              : field.type === "checkbox"
                ? fd.get(field.name) === "on"
                : fd.get(field.name);
        }
        try {
          const result = await postJson(
            endpoint,
            nested ? { action, data: values } : { action, ...values },
          );
          setSuccess(true);
          setMessage(
            typeof result === "object" && result && "message" in result
              ? String(result.message)
              : "Đã lưu thay đổi.",
          );
          router.refresh();
        } catch (error) {
          setSuccess(false);
          setMessage(error instanceof Error ? error.message : "Không thể lưu.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((field) =>
        field.type === "checkbox" ? (
          <label className="checkbox-label" key={field.name}>
            <input
              type="checkbox"
              name={field.name}
              defaultChecked={field.value === true}
            />
            {field.label}
          </label>
        ) : (
          <Field
            key={field.name}
            id={`${action}-${field.name}-${String(preset.id ?? "new")}`}
            label={field.label}
          >
            {field.type === "textarea" ? (
              <textarea
                id={`${action}-${field.name}-${String(preset.id ?? "new")}`}
                name={field.name}
                defaultValue={String(field.value ?? "")}
                required={field.required}
              />
            ) : field.type === "select" ? (
              <select
                id={`${action}-${field.name}-${String(preset.id ?? "new")}`}
                name={field.name}
                defaultValue={String(field.value ?? "")}
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                type={field.type ?? "text"}
                name={field.name}
                id={`${action}-${field.name}-${String(preset.id ?? "new")}`}
                defaultValue={
                  typeof field.value === "boolean" ? "" : field.value
                }
                required={field.required}
                min={field.type === "number" ? 0 : undefined}
              />
            )}
          </Field>
        ),
      )}
      {confirm && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            required
          />
          Tôi xác nhận thao tác trên mục này.
        </label>
      )}
      <Button disabled={busy}>{busy ? "Đang lưu…" : label}</Button>
      {message && <Alert error={!success}>{message}</Alert>}
    </form>
  );
}
export function ActionButton({
  action,
  preset,
  label,
  confirm = false,
  secondary = true,
}: {
  action: string;
  preset: Record<string, unknown>;
  label: string;
  confirm?: boolean;
  secondary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return confirm ? (
    <div className="stack">
      {!open ? (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {label}
        </Button>
      ) : (
        <>
          <ActionForm
            action={action}
            preset={preset}
            fields={[]}
            label={`Xác nhận: ${label}`}
            confirm
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Quay lại
          </Button>
        </>
      )}
    </div>
  ) : (
    <ActionButtonImmediate
      action={action}
      preset={preset}
      label={label}
      secondary={secondary}
    />
  );
}
function ActionButtonImmediate({
  action,
  preset,
  label,
  secondary,
}: {
  action: string;
  preset: Record<string, unknown>;
  label: string;
  secondary: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div>
      <Button
        variant={secondary ? "secondary" : "primary"}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await postJson("/api/admin", { action, ...preset });
            setMessage("Đã xử lý.");
            router.refresh();
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Không thể thực hiện.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Đang xử lý…" : label}
      </Button>
      {message && (
        <p className="meta" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
