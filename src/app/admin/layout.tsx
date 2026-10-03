import type { ReactNode } from "react";
import { FontPreload } from "@/components/font-preload";
import "@/styles/globals.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Quản trị · Tranh Đông Hồ",
  robots: { index: false, follow: false },
};
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <FontPreload />
      </head>
      <body>{children}</body>
    </html>
  );
}
