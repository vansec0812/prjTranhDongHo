import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, AlertCircle } from "lucide-react";
export function Button({
  variant = "primary",
  children,
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "quiet" }) {
  return (
    <button
      {...props}
      className={`button ${variant === "primary" ? "" : variant} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link href={href} className={`button${secondary ? " secondary" : ""}`}>
      {children}
    </Link>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}
export function Seal({ children = "ĐH" }: { children?: ReactNode }) {
  return (
    <span className="seal" aria-hidden="true">
      {children}
    </span>
  );
}
export function Wave() {
  return <div className="wave" aria-hidden="true" />;
}
export function Alert({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`alert-box${error ? " error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <span className="flex">
        <AlertCircle size={18} aria-hidden="true" />
        <span className="status-message">{children}</span>
      </span>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
export function DataTable({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      <table>{children}</table>
    </div>
  );
}
export function Badge({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return <span className={`badge${error ? " alert" : ""}`}>{children}</span>;
}
