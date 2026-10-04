import Link from "next/link";
import { TokenForm } from "@/components/token-form";
export default function Forgot() {
  return (
    <main className="container login-panel panel stack">
      <h1>Khôi phục mật khẩu</h1>
      <TokenForm />
      <Link href="/admin/login">Về đăng nhập</Link>
      <p className="meta">
        Kiểm tra hộp thư và thư mục spam để mở liên kết khôi phục.
      </p>
    </main>
  );
}
