# PostgreSQL và build trên Vercel

Phạm vi: Next.js web trên Vercel, PostgreSQL cloud qua Prisma 6.19.3. Không đổi schema, luật workshop hoặc tự tạo dịch vụ. Code chuẩn bị kết nối; bạn cần cung cấp DB và các tích hợp thật. Chưa có smoke test trên tài khoản Vercel/DB cloud.

## 1. Kết nối DB

Trong Vercel Project → Settings → Environment Variables, đặt hai URL cho đúng môi trường:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@POOLED_HOST:PORT/DATABASE?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@DIRECT_HOST:PORT/DATABASE?sslmode=require
```

Lấy URL thực tế từ dashboard PostgreSQL đang dùng; hai URL phải tới cùng DB/schema. URL runtime dùng connection pooling; `DIRECT_URL` dùng direct hoặc session connection hỗ trợ migration. Mật khẩu có ký tự đặc biệt phải được percent-encode. Không dùng `127.0.0.1`, `localhost` hay URL từ `.env` demo trên Vercel.

Code cũng nhận `POSTGRES_PRISMA_URL`/`POSTGRES_URL` cho runtime và `POSTGRES_URL_NON_POOLING` cho CLI. Nếu đồng thời có các tên mới và cũ, `DATABASE_URL`/`DIRECT_URL` được ưu tiên.

Trên Vercel, runtime mặc định thêm `connection_limit=1`, `connect_timeout=15`, `pool_timeout=15` nếu URL chưa cấu hình các tham số đó. Có thể đặt giá trị phù hợp với giới hạn DB/tải thực tế trong URL. Các tham số của nhà cung cấp được giữ nguyên. Không tự thêm `pgbouncer=true`: chỉ thêm khi provider yêu cầu; không dùng cờ này trong `DIRECT_URL`.

`prisma.config.ts` dành cho CLI, không thay URL pooled của Prisma Client. Local chưa có `DIRECT_URL` vẫn dùng `DATABASE_URL` như trước. Hosted production yêu cầu TLS và URL migration riêng.

## 2. Biến môi trường còn lại

| Nhóm | Cấu hình |
|---|---|
| Ứng dụng | `APP_MODE=production`, `SITE_URL=https://TEN-MIEN-CUA-BAN`, `AUTH_TRUST_HOST=true` |
| Secret | `AUTH_SECRET` ngẫu nhiên đủ mạnh, `PII_ENCRYPTION_KEY` 32-byte hex, `CRON_SECRET` riêng cho worker/scheduler |
| CAPTCHA | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` thật, đã cấp cho domain |
| Email | `MAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` |
| Media | `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| Kiểm file | `SCANNER_COMMAND` trỏ tới scanner thật, hoạt động trong môi trường upload |

Không dùng `APP_MODE=prototype`, email/file local hoặc CAPTCHA test key để bỏ qua guard. Vercel Function không chạy PostgreSQL embedded và không giữ `.local` như storage bền vững. Scanner hiện tại gọi executable qua stdin; phải đóng gói/cấp scanner phù hợp hoặc triển khai integration scanner được duyệt. Điền tên command không tồn tại không phải đã cấu hình scan thành công.

Preview cần DB riêng, deployment protection và email sandbox; không gắn DB production vào nhánh thử nghiệm. Staging noindex chưa có cấu hình riêng trong bản này, nên chưa coi Preview là môi trường staging đã nghiệm thu.

## 3. Migration và nội dung

Từ một máy có quyền truy cập DB cloud, nạp các biến môi trường tương ứng vào phiên terminal hoặc file `.env` riêng của checkout triển khai. Giữ `.env` demo hiện tại nguyên vẹn. Sau backup DB, chạy:

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run content:import
npm.cmd run admin:create -- EMAIL-QUAN-TRI-CUA-BAN
```

`db:migrate` chỉ áp dụng migration đã commit, không reset/drop. `content:import` nhập nội dung nguồn một lần; backup CMS trước thay đổi vào `.local/content-backups` tại máy chạy lệnh, giữ chỉnh sửa sau lần nhập đầu. Các nội dung/ảnh/chính sách phải được chủ cơ sở duyệt trước public. Không chạy importer trong Vercel build/function vì có ghi backup local.

`admin:create` tạo mật khẩu ngẫu nhiên và lưu riêng ở `.local/demo-access.txt` trên máy chạy lệnh; không gửi file này lên Git/Vercel. Không tự thay mật khẩu admin đã tồn tại. Lệnh hiện có nhãn file local, không phải chức năng reset production. Admin tiếp theo dùng luồng mời trong CMS.

Không chạy `setup:demo`, `db:local`, `test:prepare` hoặc `db:seed` trên DB cloud/production. `setup:demo` từ chối cấu hình cloud để tránh seed nhầm. Lịch workshop demo không được seed sang production; tạo buổi thật trong CMS. DB và dữ liệu local hiện có không được tự động chuyển lên cloud.

## 4. Build và deploy

Import repository `vansec0812/prjTranhDongHo` vào Vercel, framework Next.js, Node.js 24.x, root directory là root repository. `vercel.json` đặt Build Command `npm run build:vercel`; nếu dashboard có override cũ, đổi lại đúng lệnh này. Install Command dùng `npm ci`.

`build:vercel` kiểm config rồi chạy `prisma generate && next build`. Không migrate, seed hoặc tạo admin trong build, tránh preview/rebuild ghi vào DB ngoài ý muốn. Sau khi thay Environment Variables, cần build/deploy lại.

Chỉ release sau các gate CI/backup/integration được xác minh. Bản hiện tại còn dependency audit high và các mục BLOCKED trong ma trận; build pass không thay nghiệm thu production. Sau deploy, kiểm `/api/health` HTTP 200, public VI/EN, admin login và một luồng đăng ký trên môi trường kiểm thử. Readiness 503 phải xử lý kết nối DB, TLS, schema và quyền, không bỏ kiểm tra.

## 5. Worker

Vercel chỉ host web. Worker hiện là process riêng; chạy `npm run worker` trên môi trường bền vững đã cấu hình cùng DB/tích hợp và secret, hoặc `npm run worker -- --once` qua scheduler bên ngoài phù hợp. Không đưa vòng lặp worker vào Function hay `setInterval` của web. Chưa tạo endpoint cron Vercel hoặc đăng ký dịch vụ mới trong tác vụ DB này. Thiếu worker thì email/outbox/reminder/hold/publish hẹn giờ chưa hoạt động đầy đủ.

## Nguồn kỹ thuật

- [Prisma 6: quản lý kết nối serverless](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections).
- [Prisma: PgBouncer và kết nối direct cho CLI](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/pgbouncer).
- [Vercel: cấu hình build](https://vercel.com/docs/builds/configure-a-build).
