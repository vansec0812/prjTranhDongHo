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
          Dùng tài khoản admin được mời. Prototype tạo tài khoản đầu tiên bằng
          mật khẩu ngẫu nhiên; xem file riêng{" "}
          <code>.local/demo-access.txt</code>.
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
