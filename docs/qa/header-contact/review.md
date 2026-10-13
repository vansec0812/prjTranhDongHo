# Ngắt dòng, menu Tin tức và email liên hệ — 14/10/2026

Phạm vi yêu cầu: giữ từ ghép đi cùng dòng, thêm Tin tức trong header, email xác nhận gửi đúng địa chỉ khách nhập. Đã đọc toàn bộ AGENTS.md v1.0 và SRS phần điều hướng (p.6), liên hệ (p.9); liên quan UI-05/18/19/20/27/28, FR-HOME-01, FR-GEN-03, FR-ART-03 và ENG-16. Baseline trước: `6c59e58`; bản sau: `baed558` (typography), `f444c20` (header), `c5cf47e` (contact). Không đổi schema, baseline, tolerance, font size, dữ liệu CMS hay stack.

## Thay đổi

Formatter giữ các từ ghép/ngữ danh phổ biến của website bằng khoảng trắng không ngắt dòng: “quốc gia”, “di sản”, “văn hóa”, “Đông Hồ”… Áp dụng vào title/summary hiển thị, Intro, rich text, nhãn trường, brand và tiêu đề footer. Rich text dùng một renderer sanitize chung; không thay thuộc tính href hoặc dữ liệu editable/CMS. Heading giữ cỡ chữ và không bẻ giữa chữ; khoảng trắng giữa các cụm vẫn được xuống dòng.

Tin tức có trong cùng danh sách nav VI/EN cho desktop/mobile, không lặp trong menu mobile. Test phát hiện điều hướng EN bằng client Link khi đóng dialog đôi lúc không đi đến route; header dùng anchor chuẩn để browser hoàn tất điều hướng, giữ link thật, active, keyboard/Escape/focus.

Contact lưu email khách và hai outbox job cùng transaction. Gắn job với contact và truyền ID job vừa commit cho dispatcher, không bị backlog unrelated chặn email xác nhận. API trả địa chỉ khách/trạng thái receipt, giữ HTTP 201 khi contact đã lưu dù chưa gửi được mail. Client chỉ thông báo đã gửi khi status SENT, local capture không khẳng định gửi Internet. Resend testing-sender 403 được phân loại bằng mã kiểm soát, không lưu response chứa địa chỉ riêng; admin có hướng dẫn sửa sender.

## Kiểm tra

- `npm.cmd test`: **59/59 PASS**, 11 files. Unit giữ từ ghép, boundary/idempotency, sanitize/link/XSS; payload Resend target guest và rejection; PostgreSQL hai khách, job admin riêng, queue backlog không bị lấy nhầm.
- Format, lint, typecheck, rules và `git diff --check`: **PASS**. Không tắt lint/test hay thêm dependency.
- Production build Node 24/Linux/PostgreSQL 16.14 trong Docker QA: **PASS**. Native SWC của host Windows vẫn có giới hạn như review trước; dùng môi trường QA Linux, không thay cấu hình hệ thống Windows.
- E2E history VI/EN: **2/2 PASS**. E2E navigation/typography VI/EN: **2/2 PASS**, 6 widths, DOM Range chứng minh “quốc”/“gia” chung dòng, click Tin tức và Escape/focus, axe A/AA không violation ở trạng thái kiểm.
- Visual showcase bằng baseline Windows hiện có: **2/2 PASS**, `maxDiffPixels=0`; không viết baseline Linux hay mask diff.
- E2E local DB thực: **9/9 demo PASS**, gồm contact/inbox/email nhập, login/draft/quyền, workshop/lookup/ICS/hủy, newsletter/worker. Source/tour/Vercel HTTP: **7/7 PASS**.
- UI [before.json](before.json)/[after.json](after.json): **42/42** tổ hợp route/width. Trước có “quốc gia” tách ở lịch sử 360/375/1440; sau không tách, không tràn trang/header. Chụp 375/1440, font đã tải và thời gian cố định `2026-10-14T03:00:00Z`; readiness dựa DOM/font/paint, không chờ networkidle vì CAPTCHA có request nền.

## Bằng chứng và giới hạn

[Trước desktop](before-_lich-su-1440.png), [sau desktop](after-_lich-su-1440.png), [trước mobile](before-_lich-su-375.png), [sau mobile](after-_lich-su-375.png), [Journal EN](after-_en_tin-tuc-1440.png). Route kiểm: lịch sử, liên hệ, tin tức VI/EN và admin login; widths 360/375/768/1024/1200/1440. Đã xem ảnh thật, không thay dữ liệu để né lỗi. Live provider, cross-browser/thiết bị thật và toàn hệ thống vẫn theo ma trận; không dùng local capture/mock HTTP làm bằng chứng email Internet.

**Mail Internet chưa được xác minh trong tác vụ này.** Người dùng chọn Resend verified domain nhưng cung cấp địa chỉ Gmail thay cho sender trên domain đã Verified. Địa chỉ nhận Gmail có thể dùng; cần chốt sender/config provider hợp lệ trước khi xác minh gửi thật. Không đặt Gmail làm Resend MAIL_FROM, không chuyển receipt về ADMIN_NOTIFY_EMAIL. [Hướng dẫn](../../vercel-prototype.md#email-liên-hệ-gửi-đúng-khách--14102026) phân biệt các địa chỉ và bước cấu hình. Không commit địa chỉ riêng hay credentials của người dùng. CI remote/Vercel được kiểm sau push; báo cáo local không thay bằng chứng deploy.
