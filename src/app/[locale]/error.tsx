"use client";
import { useLocale } from "next-intl";
import { Alert, Button } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const locale = useLocale();
  return (
    <div className="container section stack">
      <h1>
        {locale === "en"
          ? "The studio is temporarily unavailable"
          : "Xưởng tạm thời chưa phản hồi"}
      </h1>
      <Alert error>
        {locale === "en"
          ? "Check your connection and try again. Your form input has not been submitted."
          : "Kiểm tra kết nối và thử lại. Nội dung form chưa được gửi thành công."}
      </Alert>
      <Button onClick={reset}>
        {locale === "en" ? "Try again" : "Thử lại"}
      </Button>
    </div>
  );
}
