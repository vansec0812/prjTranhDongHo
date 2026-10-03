import Link from "next/link";
import { TokenForm } from "@/components/token-form";
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="container login-panel panel stack">
      <h1>Đặt lại mật khẩu</h1>
      <TokenForm token={token ?? ""} />
      <Link href="/admin/login">Về đăng nhập</Link>
    </main>
  );
}
