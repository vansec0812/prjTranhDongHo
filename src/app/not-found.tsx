import "@/styles/globals.css";
import { ButtonLink } from "@/components/ui";
export default function NotFound() {
  return (
    <html lang="vi">
      <body>
        <main className="container section stack">
          <p className="eyebrow">404 · LẠC MỘT NÉT IN</p>
          <h1>Trang bạn tìm chưa có trong xưởng.</h1>
          <p>Đường dẫn có thể đã thay đổi hoặc nội dung chưa được xuất bản.</p>
          <div className="flex wrap">
            <ButtonLink href="/">Về trang chủ</ButtonLink>
            <ButtonLink href="/tim-kiem" secondary>
              Tìm trong thư viện
            </ButtonLink>
          </div>
        </main>
      </body>
    </html>
  );
}
