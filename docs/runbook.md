# Runbook local prototype

Phần PostgreSQL cloud/Vercel, migration và worker ngoài Function: [docs/vercel.md](vercel.md). Local và cloud dùng environment riêng; không chạy setup demo để chuẩn bị DB cloud.

## Prototype Vercel qua dashboard — cập nhật 04/10/2026

Xem [hướng dẫn từng bước](vercel-prototype.md). Nhánh `codex/vercel-prototype` chuẩn bị cấu hình; dependency audit còn BLOCKED, chưa tự merge/release. Các lệnh developer thực tế: `npm run build:vercel` kiểm config/generate; chỉ khi `BOOTSTRAP_DEMO=true` và profile cloud prototype Production mới migrate deploy/import một lần/tạo admin. Không dùng `setup:demo` cho Neon. Không reset/drop DB.

`node scripts/prepare-vercel-env.mjs` tạo file riêng `.local/vercel-copy.env` bằng `wx`, từ chối ghi đè secret cũ. Artifact đã tạo cho chủ dự án; không commit. Import Production sau khi thay email/sender/Turnstile; Neon, private Blob và Resend cấp credential riêng. Giữ encryption key khi DB có dữ liệu. Redeploy giữ CMS/admin/password; muốn rollback web chọn deployment trước, không tự rollback schema hoặc xóa marker. Backup/snapshot DB trước migration nếu có dữ liệu cần giữ; cloud restore chưa kiểm.

Mail thật được xử lý sau commit bằng Resend, lỗi giữ outbox và retry. `/admin/email` có nút xử lý nền theo session/quyền; `/api/cron` GET yêu cầu Bearer `CRON_SECRET` và Vercel cron `0 0 * * *`. Hobby daily cron không bảo đảm lịch phút/nhắc đúng 24h. Xem status provider và hộp thư thật, không coi SENT là mail tới inbox. Sau deploy kiểm `/api/health` trả `ready` (kiểm bảng schema thiết yếu), ảnh nguồn/VR/admin/form/mail/ICS/private attachment. Chưa có credentials cloud nên smoke này vẫn BLOCKED.

Trên máy Windows này, native cache SWC cần đường dẫn owner-only: `$env:SWC_NATIVE_BINDING_CACHE='C:\Users\Asus\.codex\swc-native-cache'` trước build/dev/start; không thay Windows Application Control/ACL. Linux Vercel không cần cấu hình này. Argon2id dùng Node 24 builtin, đọc PHC cũ theo tên tham số m/t/p dù thứ tự khác. `node scripts/verify-vercel-ui.mjs before|after` tạo bằng chứng UI từ tài khoản private local; không upload trace chứa credential.

## Setup và chạy

`npm ci`, `npm run setup:demo`, `npm run demo`. Setup sinh secret, khởi động PostgreSQL local nếu chưa nghe 54329, `prisma generate`, `prisma migrate deploy`, seed idempotent và admin mật khẩu ngẫu nhiên. Xem `.local/database.log` nếu DB không khởi động; không xóa `.local/postgres` để chữa lỗi.

`npm run demo` chạy web và worker cùng terminal, Ctrl+C dừng hai process. DB khởi động riêng, không tự xóa/dừng dữ liệu khi web dừng. Chạy `npm run db:local` trong terminal riêng khi cần tự quản lý DB; Ctrl+C ở terminal đó dừng DB an toàn. Nếu DB đã online, không chạy thêm instance cùng port.

`npm run build` và `npm start` chạy web tối ưu. Worker chạy bằng `npm run worker` trong terminal riêng. Kiểm tra readiness `/api/health`, outbox `/admin/email`, worker heartbeat trong SiteSetting. Email local tại `.local/mail`; không xác nhận email production dựa trên file capture.

PowerShell có thể chặn `npm.ps1`; dùng `npm.cmd`/`npx.cmd` cho các lệnh trên mà không đổi ExecutionPolicy. Trên Windows, dừng web và worker trước build/generate vì Prisma DLL đang dùng sẽ bị khóa; giữ DB online.

## Cập nhật ảnh và tour

`npm.cmd run assets:prepare` chuyển các nguồn gốc sang ảnh public, bỏ metadata và kiểm tra ngân sách 8K/4K/preview/thumb. HEIC dùng `heic-convert`, ảnh dùng `sharp`; không ghi đè các file trong `sourceImage`/`sourceVR`. Manifest `public/tour/assets.json` lưu kích thước, dung lượng và SHA-256 nguồn. Lệnh này tạo lại `public/tour/tour.json` từ `scripts/configure-tour.mjs`: nếu đã chỉnh thủ công tọa độ, sao lưu JSON trước khi chạy hoặc sửa script cấu hình tương ứng.

`npm.cmd run content:import` nhập ảnh và bài mô tả VI/EN vào CMS một lần. Marker `source-images-tour-v1` khiến lần chạy sau không ghi đè chỉnh sửa CMS. Backup nội dung cũ tại `.local/content-backups/`, không xuất bảng đăng ký, hộp thư hoặc tài khoản admin; nội dung CMS/cấu hình vẫn phải bảo quản riêng. Không xóa marker để ép nhập lại vào DB đang dùng; thay nội dung qua CMS hoặc viết bản import tiếp theo có kiểm tra và backup riêng.

Tour mở tại `/tham-quan-360` và `/en/virtual-tour`; `?diem=ban-in` chọn điểm. Dev-only `/dev/hotspot-picker` lấy yaw/pitch; production build trả 404. Bổ sung ảnh cầu 2:1 đúng điểm khảo sát và MP3 VI/EN vào cấu hình khi có nguồn; không tự dùng tên chín địa điểm của PDF cho bốn ảnh một phòng. Âm thanh chưa có thì nút bị vô hiệu hóa với lý do, không autoplay. JSON được validate lúc nạp; URL asset chỉ thuộc thư mục cho phép.

`node scripts/verify-source-ui.mjs` chạy trên web tối ưu đang online: năm viewport, public VI/EN và admin đăng nhập thật, axe và ảnh 375/1440. `npm.cmd run test:e2e` bao gồm source images/tour và baseline showcase bất biến. Chưa có Git remote nên bằng chứng gắn SHA-256 bằng `node scripts/qa-manifest.mjs`, không bịa commit.

## Migration / seed / test

`npm run db:migrate` deploy migration hiện có, không reset. `npm run db:seed` chỉ prototype, idempotent, không ghi đè nội dung đã sửa. Tạo admin đầu bằng `npm run admin:create -- email@example.invalid` (file credential riêng phải chưa tồn tại). Các admin tiếp theo dùng thư mời trong CMS.

`npm run test:prepare` tạo DB `dongho_test` nếu chưa có và deploy migrations; `npm test` dùng DB này. Không chạy integration trên DB người dùng. E2E hiện yêu cầu web demo online và file access local.

## Sự cố

- CAPTCHA mất mạng: form giữ dữ liệu, không gửi; kiểm tra kết nối Cloudflare và tải lại. Không vô hiệu hóa kiểm tra server.
- Email FAILED sau ba lần: kiểm tra SMTP, dùng gửi lại trong admin. Không thay trạng thái thành SENT thủ công.
- Hết phiên: đăng nhập lại, không tự tăng idle timeout 8h.
- Capacity lỗi: không sửa trực tiếp registration/hold; dùng API khóa cùng hàng buổi.

## Backup, restore, rollback

**Chưa triển khai/kiểm chứng job backup hằng ngày, giữ 30 bản và restore thử. BLOCKED cho production NFR-07.** Không có lệnh restore/reset giả hoặc destructive trong script. Trước release cần backup PostgreSQL + media versioning + encrypted key phù hợp và kiểm tra restore vào DB riêng; không restore PII đã anonymize.

Migration sửa lỗi dùng forward-fix mới, không chỉnh migration đã áp dụng. Chưa có CI remote/deploy/rollback production; không có bằng chứng HTTPS, uptime hoặc smoke sau deploy. Chỉ chạy loopback local theo phạm vi user.
