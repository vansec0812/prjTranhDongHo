import Link from "next/link";
import { AdminLogin } from "@/components/admin-login";
import { Brand } from "@/components/header";
export default function Login() {
  return (
    <main className="container login-panel">
      <div className="panel stack">
        <Brand admin />
        <p className="eyebrow">QUẢN TRỊ NỘI DUNG & HOẠT ĐỘNG</p>
        <h1>Chào bạn, trở lại xưởng.</h1>
        <p className="small">
          Dùng tài khoản quản trị đã được cấp hoặc kích hoạt qua email mời.
        </p>
        <AdminLogin />
        <Link className="text-link" href="/admin/quen-mat-khau">
          Quên mật khẩu
        </Link>
        <Link className="text-link" href="/">
          Về website
        </Link>
      </div>
    </main>
  );
}
