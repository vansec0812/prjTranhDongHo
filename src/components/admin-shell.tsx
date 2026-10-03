"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, ArrowUpRight, LogOut } from "lucide-react";
import { Brand } from "./header";
import { adminModules } from "@/lib/admin";
export function AdminShell({
  children,
  name,
}: {
  children: ReactNode;
  name: string;
}) {
  const path = usePathname();
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        Đến nội dung chính
      </a>
      <aside className="admin-sidebar">
        <Brand admin />
        <nav aria-label="Menu quản trị">
          <Link
            className={`nav-link${path === "/admin" ? " active" : ""}`}
            href="/admin"
          >
            <LayoutDashboard size={18} />
            Tổng quan
          </Link>
          {adminModules.map((module) => (
            <Link
              className={`nav-link${path.startsWith("/admin/" + module.path) ? " active" : ""}`}
              key={module.path}
              href={"/admin/" + module.path}
            >
              {module.label}
            </Link>
          ))}
          <Link className="nav-link" href="/" target="_blank">
            Xem website <ArrowUpRight size={16} />
          </Link>
          <button
            className="nav-link"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </nav>
      </aside>
      <main className="admin-main" id="admin-main">
        <div className="admin-toolbar">
          <span className="small">Xưởng tranh Đông Hồ</span>
          <span className="meta">
            {name} ·{" "}
            {process.env.NEXT_PUBLIC_APP_MODE === "production"
              ? "Production"
              : "Prototype local"}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
