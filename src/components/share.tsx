"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "./ui";
export function Share({ locale }: { locale: string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="flex wrap">
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(location.href);
            setMessage(
              locale === "en" ? "Link copied" : "Đã sao chép liên kết",
            );
          } catch {
            setMessage(
              locale === "en"
                ? "Unable to copy; use your address bar."
                : "Không thể sao chép; dùng thanh địa chỉ trình duyệt.",
            );
          }
        }}
      >
        <Copy size={18} />
        {locale === "en" ? "Copy link" : "Sao chép liên kết"}
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`,
            "_blank",
            "noopener,noreferrer",
          )
        }
      >
        Facebook
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          window.open(
            `https://zalo.me/share?url=${encodeURIComponent(location.href)}`,
            "_blank",
            "noopener,noreferrer",
          )
        }
      >
        Zalo
      </Button>
      {message && (
        <span role="status" className="meta">
          {message}
        </span>
      )}
    </div>
  );
}
