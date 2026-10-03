import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "./domain";
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: "VALIDATION",
        message: "Kiểm tra lại các trường / Please check your details",
        fields: error.flatten().fieldErrors,
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof DomainError)
    return NextResponse.json(
      {
        error: error.code,
        message:
          error.code === "RATE_LIMIT"
            ? "Bạn gửi quá nhiều lần. Hãy thử lại sau / Too many requests. Try later."
            : error.code === "CONTENT_REFERENCED"
              ? "Nội dung đang có dữ liệu liên quan. Hãy ẩn thay vì xóa để giữ lịch sử / Referenced content cannot be deleted. Hide it to retain history."
              : error.code === "CAPTCHA_UNAVAILABLE"
                ? "Dịch vụ chống spam chưa sẵn sàng / Spam protection unavailable"
                : error.code === "CONFIG_UNAVAILABLE"
                  ? "Tích hợp chưa được cấu hình / Integration is not configured"
                  : "Không thể thực hiện. Kiểm tra thông tin hoặc thử lại / Action unavailable. Check details or try again.",
      },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error(
    JSON.stringify({
      event: "api_error",
      type: error instanceof Error ? error.name : "Unknown",
      at: new Date().toISOString(),
    }),
  );
  return NextResponse.json(
    {
      error: "SERVER_ERROR",
      message:
        "Hệ thống tạm thời không phản hồi. Dữ liệu nhập vẫn được giữ / Temporarily unavailable. Your input has been preserved.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
