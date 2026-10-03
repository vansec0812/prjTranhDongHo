import type { ReactNode } from "react";
import "@/styles/globals.css";
export const metadata = {
  title: "Design system · Tranh Đông Hồ",
  robots: { index: false, follow: false },
};
export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
