import Link from "next/link";
import { TokenForm } from "@/components/token-form";
export default async function Activate({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="container login-panel panel stack">
      <h1>Nhận lời mời quản trị</h1>
      <TokenForm token={token ?? ""} invite />
      <Link href="/admin/login">Về đăng nhập</Link>
    </main>
  );
}
