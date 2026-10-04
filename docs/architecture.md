# Kiến trúc đang triển khai

Tour bổ sung: `src/lib/tour.ts` validate file JSON, IDs/liên kết ngược/đường asset/góc/ngân sách ảnh. `TourExperience` quản lý URL/locale/dialog/controls; `TourViewer` tải động Photo Sphere Viewer, ảnh preview → ảnh nét, vùng nhìn giới hạn, preload các điểm liền kề. Kiểm tra WebGL trước import engine để fallback không đi qua lỗi module; giảm chuyển động khi được yêu cầu. Pipeline bắt đầu sau microtask khởi tạo của PSV 5.15.1 để tránh constructor và app cùng tải panorama. Nguồn không có 360° kín cầu nên không tự nối biên hay tạo trần/sàn. Dữ liệu tour demo là JSON theo PDF, không thêm schema/admin tour ngoài phạm vi.

Next.js 15 App Router/TypeScript strict, Tailwind 4, next-intl và font self-host. PostgreSQL 16/Prisma 6; Auth.js Credentials + Argon2id; TOTP otplib, secret mã hóa AES-256-GCM ngoài DB. Rich text Tiptap được sanitize lại tại server; Zod allowlist DTO.

`src/components` chịu trách nhiệm UI; `src/lib/domain.ts` validation/giá/thời gian/trạng thái thuần; `src/lib/services` transaction nghiệp vụ; `storage.ts`, `security.ts`, `auth.ts`, `ics.ts` là integration. API bắt quyền, origin và validation trước mutation; public không trả model admin/ghi chú nội bộ.

Prisma có Content chung (VI/EN, slug, trạng thái xuất bản) và các subtype Page/HistoryMilestone/Painting/Video/Workshop/Artisan/Post/Product/Faq/HeroSlide. Category chung + subtype dòng tranh/video. Media quan hệ FK giữ nơi sử dụng. Registration, WorkshopSession, Hold, ContactMessage, Subscriber, SiteSetting, AdminUser, AdminSession, AuditLog, Redirect, RateLimit, Outbox, Token và VideoView phục vụ nghiệp vụ.

Hold tách riêng để không đếm chỗ hai lần. Outbox commit cùng nghiệp vụ để email lỗi không làm mất đăng ký. Token lưu hash và purpose, có hạn và dùng một lần. AdminSession bảo đảm idle 8h và thu hồi session khi tài khoản/credential đổi. RateLimit nằm trong DB dùng chung instance; không dùng bộ nhớ web.

Mọi mutation số chỗ khóa hàng WorkshopSession `FOR UPDATE`, tính new+confirmed+hold chưa hết hạn trong cùng transaction. Điện thoại chuẩn hóa E.164, tối đa hai đăng ký hiệu lực/buổi. Idempotency key gắn fingerprint, dùng lại với payload khác trả 409. Tiền VND số nguyên và snapshot giá giữ lịch sử.

Worker riêng polling job bền vững trong DB: publish hẹn giờ, deadline, hold hết hạn/FIFO, nhắc confirmed 24h, anonymize, outbox. Job email có lease `SKIP LOCKED`, retry ba lần/backoff. SMTP lỗi giữ bản ghi và cho admin gửi lại; hộp thư chỉ REPLIED sau provider nhận. Local capture là trạng thái riêng LOCAL_CAPTURED. SMTP không bảo đảm exactly-once khi process chết sau provider ACK; cần provider idempotency trước production.

Adapters local dùng `.local` (ignored); R2 adapter qua S3 SDK và SMTP qua Nodemailer. Production cần HTTPS, CAPTCHA thật, scanner và cấu hình đầy đủ. Chưa có triển khai public, cache CDN, backup tự động, monitoring tập trung hay SLA đã quan sát. Các mục chưa triển khai nằm trong ma trận.

Web Vercel dùng Node.js 24 và PostgreSQL cloud. `src/lib/database-config.ts` kiểm URL/TLS, giữ tham số nhà cung cấp và giới hạn pool mặc định trên Vercel; `src/lib/db.ts` dùng URL runtime pooled. `prisma.config.ts` giữ engine classic Prisma 6 hiện tại, dùng direct/session URL cho CLI migration, fallback local khi chưa có DIRECT_URL. Schema và migrations không đổi. Build chỉ generate/compile; worker vẫn chạy ngoài Function. Chi tiết: [vercel.md](vercel.md).

Profile `vercel-prototype` (04/10/2026) là opt-in riêng theo yêu cầu dashboard-only: build migrate/bootstrap một lần qua marker và advisory lock, private Blob thay filesystem, Resend HTTP thay local capture. Pooled/direct URL nhận alias Neon. Node 24 builtin Argon2id giữ PHC và work factors cũ. Request đợi bounded mail dispatch sau transaction; `/api/cron` + admin trigger dùng cùng worker/lease DB, cron Hobby daily không đạt scheduler phút. Local adapters vẫn riêng, APP_MODE production vẫn cần scanner; ảnh cloud demo chỉ DECODED_PROTOTYPE. Details/limits: docs/vercel-prototype.md và ADR mới; mô tả build chỉ compile ở trên vẫn áp dụng khi không opt-in bootstrap.
