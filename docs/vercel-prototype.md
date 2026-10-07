# Deploy prototype qua dashboard Vercel

Áp dụng repository `vansec0812/prjTranhDongHo`, nhánh chuẩn bị `codex/vercel-prototype`, website `https://prj-tranh-dong-ho.vercel.app`. Không cần chạy terminal để migrate, seed hay tạo admin. Nếu tên miền khác, thay `SITE_URL` và domain Turnstile cho khớp.

**Trạng thái bàn giao:** source đã chuẩn bị để review; chưa tự merge/public deployment. Gate dependency audit đang BLOCKED bởi GHSA-vfj7-8cjw-p6xm chưa có bản vá. AGENTS.md GOV-02, QA-07 và OPS-04 yêu cầu CI xanh trước release; không đổi Production Branch để né gate. Bạn có thể chuẩn bị cấu hình dưới đây ngay, nhưng bước Redeploy chỉ thực hiện sau khi gate và review được giải quyết. Sau đó merge nhánh đã review vào `main` trên GitHub, giữ Production Branch `main`.

Bạn đã chọn **email thật**. Có hai việc Vercel không cấp tự động: xác minh tên miền gửi mail tại Resend và lấy cặp khóa Turnstile tại Cloudflare. Cần làm một lần trên các dashboard đó; sau đó toàn bộ build/redeploy thực hiện trên Vercel. Không thể tạo khóa thật bằng cách điền giá trị mẫu. DNS có thể nhập tại Vercel nếu domain đang dùng nameserver Vercel. Không tự mua domain hoặc nâng gói dịch vụ.

## 1. Chọn đúng project và cấu hình build

1. Mở [Vercel dashboard](https://vercel.com/dashboard), chọn project `prj-tranh-dong-ho` đang bị lỗi. Nếu chưa có project, **Add New → Project → Import** repository `vansec0812/prjTranhDongHo`.
2. **Settings → Git**: kiểm repository `vansec0812/prjTranhDongHo`. **Settings → Environments → Production → Branch Tracking**: Production Branch là `main`. Chỉ deploy sau khi bản sửa đã được kiểm tra và merge vào `main`; Redeploy commit cũ không lấy code từ nhánh review.
3. **Settings → Build and Deployment**: Framework **Next.js**, Root Directory **root repository** (`./`, hoặc để trống), Node.js **24.x**. Copy:

| Trường           | Giá trị                                  |
| ---------------- | ---------------------------------------- |
| Install Command  | `npm ci`                                 |
| Build Command    | `npm run build:vercel`                   |
| Output Directory | Để mặc định của Next.js; không đặt `out` |

Save. Không chọn Static Export: website có DB, admin và API server.

## 2. Tạo và kết nối PostgreSQL

1. Project → **Storage → Create Database / Browse Marketplace → Neon**.
2. Tạo database **riêng cho prototype**, chọn khu vực gần Vercel Functions (ví dụ Singapore nếu có). Kiểm tra gói/giới hạn hiển thị trước khi xác nhận; không cần nâng gói chỉ để demo.
3. **Connect to Project** → chọn project này → environment **Production**. Bỏ Preview/Development cho DB demo đang dùng.
4. Trong **Settings → Environment Variables**, kiểm tra `DATABASE_URL` và `DATABASE_URL_UNPOOLED` do integration tạo. Code dùng `DATABASE_URL_UNPOOLED` cho migration, không cần tự đổi tên thành `DIRECT_URL`.
5. Xóa giá trị cũ `DATABASE_URL`/`DIRECT_URL` trỏ `localhost` hoặc `127.0.0.1`. Nếu có `DIRECT_URL` cũ, nó được ưu tiên hơn alias Neon, nên phải xóa hoặc thay URL direct của chính DB Neon này. Cả URL cần `sslmode=require` hoặc stricter, cùng DB/schema. Không tự thêm `pgbouncer=true` vào URL direct.

Vercel dùng [PostgreSQL qua Marketplace](https://vercel.com/docs/postgres), không chạy database local trong Function. Khi DB đã có dữ liệu cần giữ, tạo backup/snapshot ở provider trước migration; không xóa DB để chữa lỗi.

## 3. Kho ảnh private

1. Project → **Storage → Create Storage → Blob → Continue**.
2. Access chọn **Private**, đặt tên `dongho-prototype-media`, Create.
3. Connect to Project → đúng project → **Production**. Giữ tên biến mặc định. Vercel cấp `BLOB_READ_WRITE_TOKEN`, hoặc kết nối OIDC với `BLOB_STORE_ID`/`VERCEL_OIDC_TOKEN`; SDK tự chọn thông tin kết nối.
4. Không tạo Public store để chứa ảnh đính kèm liên hệ. App phục vụ ảnh qua API kiểm quyền; khách không được lấy ảnh private của hộp thư. Chín ảnh nguồn và panorama có sẵn trong Git, không phải upload lại bằng tay.

Các bước này theo [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk). Kiểm tra hạn mức lưu trữ/băng thông tại dashboard. Code bổ sung adapter Blob; adapter R2 cũ vẫn tồn tại.

## 4. Email Resend thật

Bạn hiện chưa có tên miền riêng: tạo tài khoản trực tiếp tại Resend, tạo API key có quyền gửi mail, thêm `RESEND_API_KEY` loại **Secret** vào Vercel Production. Giữ `MAIL_MODE=resend`, đặt `MAIL_FROM=Dong Ho <onboarding@resend.dev>`, `ADMIN_NOTIFY_EMAIL` và `INITIAL_ADMIN_EMAIL` bằng email của tài khoản Resend. Dùng chính email đó khi thử form. Đây là email thật nhưng chỉ gửi thử tới email tài khoản; gửi tới khách khác cần domain Verified. Nếu luồng cài Resend native yêu cầu domain, không mua domain để vượt bước; dùng tài khoản/API key trực tiếp như trên.

Các bước dưới áp dụng khi bạn đã có domain riêng:

1. Vercel → **Marketplace → Resend → Add Integration** → kết nối project. Nếu yêu cầu, tạo/kết nối tài khoản Resend.
2. Kiểm tra biến `RESEND_API_KEY` được cấp cho **Production**. Nếu integration không cấp tự động, tại Resend tạo API key có quyền gửi mail rồi thêm vào Vercel với đúng tên đó.
3. Mở dashboard Resend → **Domains → Add Domain**. Dùng tên miền bạn có quyền quản lý, ví dụ subdomain `mail.tenmiencuaban.vn`.
4. Copy **đúng các bản ghi DNS do Resend hiển thị**. Nếu DNS đặt tại Vercel: Vercel → Domains → chọn domain → DNS Records → thêm từng Type/Name/Value/Priority tương ứng. Nếu DNS thuộc nhà cung cấp khác, thêm tại nhà cung cấp đó. Không dùng bản ghi DNS mẫu.
5. Quay lại Resend → Verify; chỉ tiếp tục khi domain **Verified**.
6. `MAIL_FROM` dùng địa chỉ thuộc domain đã Verified, ví dụ `Dong Ho <website@mail.tenmiencuaban.vn>`. `ADMIN_NOTIFY_EMAIL` và `INITIAL_ADMIN_EMAIL` là email thật của bạn.

Resend có [integration Marketplace](https://vercel.com/changelog/resend-vercel-marketplace). Sender `onboarding@resend.dev` bị giới hạn gửi thử tới địa chỉ tài khoản Resend, không đáp ứng việc gửi tới khách bất kỳ; xem [hướng dẫn domain](https://resend.com/docs/dashboard/domains/introduction).

Mail được gửi sau transaction. Nhà cung cấp từ chối/timeout không mất đăng ký; job có retry và xem lỗi tại `/admin/email`. Idempotency key dùng ID outbox theo [API Resend](https://resend.com/docs/api-reference/emails/send-email); nhà cung cấp giữ key 24 giờ, không coi đó là đảm bảo exactly-once vô hạn.

## 5. CAPTCHA thật — cấu hình một lần ở Cloudflare

1. Mở [Cloudflare Turnstile](https://dash.cloudflare.com/), **Turnstile → Add widget**.
2. Tên `Dong Ho prototype`, hostname `prj-tranh-dong-ho.vercel.app` (không có `https://`/path), mode **Managed**. Thêm domain riêng nếu dùng.
3. Copy **Site key** vào `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, **Secret key** vào `TURNSTILE_SECRET_KEY` trong file ở bước 6.
4. Không dùng official test key `1x000...`. App kiểm CAPTCHA tại server và sẽ từ chối cloud profile thiếu khóa thật.

Theo [tài liệu Cloudflare](https://developers.cloudflare.com/turnstile/get-started/). Không cần thay nameserver website chỉ để dùng widget Turnstile.

## 6. Import cấu hình đã chuẩn bị

Trên máy chủ dự án, file riêng **`D:\prjTranhDongHo\.local\vercel-copy.env`** đã có secret/mật khẩu ngẫu nhiên. File bị Git ignore và không nằm trên GitHub. Mở file, thay các giá trị `THAY_...`:

| Biến                             | Điền gì                                       |
| -------------------------------- | --------------------------------------------- |
| `INITIAL_ADMIN_EMAIL`            | Email admin thật của bạn                      |
| `ADMIN_NOTIFY_EMAIL`             | Email nhận thông báo, có thể cùng email admin |
| `MAIL_FROM`                      | Sender thuộc domain Resend đã Verified        |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key của widget ở bước 5                  |
| `TURNSTILE_SECRET_KEY`           | Secret key của widget ở bước 5                |

Giữ nguyên `AUTH_SECRET`, `PII_ENCRYPTION_KEY`, `CRON_SECRET`, `INITIAL_ADMIN_PASSWORD` đã tạo. **Không tự thay encryption key khi DB có dữ liệu**: ghi chú/TOTP đang mã hóa phụ thuộc khóa này. Lưu riêng mật khẩu để đăng nhập lần đầu.

Vercel Project → **Settings → Environment Variables → Import .env**, chọn file riêng đó, chọn **Production**, Save. Nếu giao diện chỉ có ô Key/Value, paste toàn bộ nội dung `.env` vào form để tách các biến; hoặc Add từng cặp. Đừng import `.env` local vào Vercel, đừng đánh dấu các secret bằng prefix `NEXT_PUBLIC_`.

Nếu đã thêm Neon/Blob/Resend/Turnstile như các ảnh dashboard: chỉ bổ sung cấu hình còn thiếu từ `.local/vercel-config.env` với loại **Config**, và bốn giá trị hiện có trong `.local/vercel-secrets.env` với loại **Secret**. Không import lại giá trị `THAY_...` đè khóa provider đã cấu hình. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` là **Config**; `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `AUTH_SECRET`, `PII_ENCRYPTION_KEY`, `CRON_SECRET`, `INITIAL_ADMIN_PASSWORD` là **Secret**. Chuyển loại giữ nguyên giá trị, không tự xoay khóa mã hóa hoặc mật khẩu.

Biến cốt lõi trong file:

```dotenv
APP_MODE=prototype
DEPLOYMENT_PROFILE=vercel-prototype
NEXT_PUBLIC_APP_MODE=prototype
NEXT_PUBLIC_DEPLOYMENT_PROFILE=vercel-prototype
BOOTSTRAP_DEMO=true
SITE_URL=https://prj-tranh-dong-ho.vercel.app
AUTH_TRUST_HOST=true
TRUST_PROXY=true
MAIL_MODE=resend
MEDIA_STORAGE=vercel-blob
```

Neon/Blob/Resend đã cấp key riêng ở các bước trước; file riêng không chứa DB URL hoặc key provider mẫu. Không thêm biến `VERCEL`/`VERCEL_ENV` thủ công, Vercel cấp tự động. Vercel gọi môi trường nhánh chính là **Production**; `APP_MODE=prototype` vẫn là **bản demo**, không được coi đã nghiệm thu production thật. Profile dùng DB/kho ảnh/mail thật, không ghi `.local` trên Function.

Theo [quản lý biến môi trường Vercel](https://vercel.com/docs/environment-variables/managing-environment-variables), cập nhật env cần deploy lại để có hiệu lực.

## 7. Redeploy

1. **Deployments** → chọn deployment của commit mới nhất trên `main` → **⋯ → Redeploy**.
2. Chọn environment **Production**. Lần đầu nên bỏ **Use existing Build Cache**, rồi Redeploy.
3. Build sẽ kiểm config, generate Prisma, dùng direct URL áp dụng migration, seed minh họa/import 9 tranh nguồn + nội dung tour một lần, tạo admin nếu DB chưa có admin, sau đó build Next.js.
4. Log thành công có `Committed migrations applied without reset` và `Prototype database ready`. Không có secret/mật khẩu trong log.
5. Redeploy không đổi mật khẩu, giá/buổi/đăng ký hoặc chỉnh sửa CMS. Backup nội dung trước importer lưu trong DB key `content-backup:source-images-tour-v1`; marker bảo đảm không nhập lại. Bootstrap có advisory lock chống hai build cùng nhập.
6. Sau đăng nhập thành công, đổi mật khẩu trong admin và xóa `INITIAL_ADMIN_PASSWORD` khỏi Vercel; có thể xóa `INITIAL_ADMIN_EMAIL` nữa. Giữ `BOOTSTRAP_DEMO=true` để build sau áp dụng migration mới, không tạo lại dữ liệu mẫu đã có marker. Không xóa marker để seed lại.

## 8. Kiểm tra sau deploy

1. Mở `https://prj-tranh-dong-ho.vercel.app/api/health`: phải HTTP 200 và `status: ready`.
2. Mở `/`, `/en`, `/thu-vien-tranh`, chi tiết một tranh, `/tham-quan-360`. Kiểm ảnh/tour và liên kết ngôn ngữ.
3. `/admin/login`: email `INITIAL_ADMIN_EMAIL` và mật khẩu trong file riêng. CMS có thể sửa nội dung đã nhập. Local admin/password không được copy từ DB trên máy.
4. Tạo một buổi workshop tương lai trong admin nếu buổi minh họa đã hết hạn; thử đăng ký bằng **email nhận thật của bạn**, nhận mã và email/ICS, rồi tra cứu bằng mã + SĐT.
5. Thử liên hệ kèm ảnh nhỏ, xác minh inbox admin và email; guest không được truy cập ảnh đính kèm trực tiếp. Ảnh gốc tối đa 5 MB được browser chuẩn hóa trước upload để tổng request 3 ảnh nằm dưới giới hạn Function, server vẫn validate lại.
6. Thử bản tin: nhận email xác nhận, mở link xác nhận, thử hủy nhận tin. Không tự tick consent hay tự xác nhận email của khách.
7. `/admin/email` → nút **Xử lý công việc nền và email đang chờ** để chạy job và gửi lại khi demo. `SENT` chỉ nghĩa provider đã nhận, không chứng minh khách đã nhận thư; kiểm Resend Logs/hộp thư/spam.
8. Vercel → **Settings → Cron Jobs**: `/api/cron` chạy hằng ngày. Có thể **Run** từ dashboard. Endpoint yêu cầu `Authorization: Bearer CRON_SECRET`; mở bằng browser không có header sẽ trả 401, đó là đúng. Không paste secret vào URL.

## 9. Giới hạn cần biết

- [Hobby Cron](https://vercel.com/docs/cron-jobs/usage-and-pricing) chỉ chạy mỗi ngày một lần, thời điểm có thể lệch trong giờ. `0 0 * * *` là khoảng 07:00 Việt Nam, không đảm bảo reminder chính xác 24 giờ hoặc release hold đúng phút. API đăng ký/nhận hold vẫn kiểm deadline/expiry tại server. Mail phát sinh từ form được xử lý ngay sau commit, còn retry/offline job cần cron/nút admin. Muốn lịch phút chính xác cần scheduler được duyệt hoặc gói phù hợp; chưa tự nâng gói.
- Cloud prototype chuẩn hóa/decode ảnh, trạng thái `DECODED_PROTOTYPE`, **chưa scan antivirus**. Chế độ ứng dụng `production` vẫn fail closed khi không có scanner thật. Không dùng profile prototype để công bố đã đạt SEC-05 production.
- Video upload 500 MB/resume/frame/VTT và các hạng mục đang BLOCKED trong ma trận chưa được nghiệm thu. Video YouTube/Vimeo được dùng nếu nguồn hoạt động; chưa có MP3/đủ 9 panorama trong nguồn.
- Bản demo noindex, không thu tiền; thông tin cơ sở, chính sách, bản quyền cần xác nhận trước release thực tế. Backup/restore, deliverability mail, Blob/Neon và smoke trên tài khoản cloud **chưa được xác minh** khi chưa có credential.
- CI/audit còn advisory hiện có; không hạ gate để triển khai. Bản thay đổi chuẩn bị quy trình deploy, không xác nhận đủ điều kiện release production.

## 10. Nếu lỗi

| Log / biểu hiện                                  | Thao tác                                                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Missing database config` / `Missing DIRECT_URL` | Connect Neon Production, kiểm `DATABASE_URL`/`DATABASE_URL_UNPOOLED`; xóa direct URL local cũ                                                                  |
| `must point to hosted PostgreSQL`                | Không dùng `.env` local; thay URL từ integration                                                                                                               |
| `Migration failed` / readiness 503               | Kiểm Neon đang hoạt động, cùng DB/schema, TLS, quyền migration; xem `_prisma_migrations` tại provider; không reset/drop                                        |
| `Missing required production config: ...`        | Thêm đúng biến được nêu, đúng environment, Redeploy                                                                                                            |
| `Demo adapters are forbidden`                    | Dùng khóa Turnstile thật, `MAIL_MODE=resend`; không sửa guard                                                                                                  |
| `First deployment requires INITIAL_ADMIN...`     | Điền email thật và mật khẩu ngẫu nhiên ≥20 ký tự; Redeploy                                                                                                     |
| `Another database bootstrap is running`          | Đợi build kia hoàn tất rồi Redeploy; không xóa marker/lock                                                                                                     |
| `Missing private Vercel Blob connection`         | Kết nối **Private** Blob với Production                                                                                                                        |
| Outbox `ResendHTTP403/422`                       | Kiểm Verified domain, sender, API key/quyền gửi; Resend Logs; admin thử gửi lại                                                                                |
| CAPTCHA invalid                                  | Domain widget phải đúng domain truy cập, hai key phải cùng widget; sửa env rồi Redeploy                                                                        |
| Form `INVALID_ORIGIN`                            | `SITE_URL` phải là domain bạn đang mở; không dùng deployment URL ngẫu nhiên để gửi form                                                                        |
| Application error + Digest                       | Vercel → project → Logs → lọc Function runtime/error. Digest không cho biết nguyên nhân; tìm lỗi config/DB tương ứng, không điền secret vào log gửi người khác |
