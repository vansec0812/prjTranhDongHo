import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
export default async function Protected({ children }: { children: ReactNode }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
  return <AdminShell name={admin.name}>{children}</AdminShell>;
}
