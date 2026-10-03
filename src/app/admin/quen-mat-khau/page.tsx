import Link from "next/link";
import { TokenForm } from "@/components/token-form";
export default function Forgot() {
  return (
    <main className="container login-panel panel stack">
      <h1>Khôi phục mật khẩu</h1>
      <TokenForm />
      <Link href="/admin/login">Về đăng nhập</Link>
      <p className="meta">
        Prototype local: email kiểm thử được lưu riêng tại .local/mail, không
        gửi qua internet.
      </p>
    </main>
  );
}
