# PLAN TRIỂN KHAI – Website Văn hóa Tranh Đông Hồ

> Tài liệu gốc: `SRS_Website_Tranh_Dong_Ho.pdf` (v1.0). Các mã FR-/NFR-/BR- trong plan này tham chiếu tới SRS.
> Cách dùng: làm tuần tự từng giai đoạn. Mỗi task có checkbox, tiêu chí "Xong khi". Không sang giai đoạn sau khi giai đoạn trước chưa đạt "Điều kiện hoàn thành".

---

## 0. Tổng quan

| Hạng mục | Lựa chọn |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript (strict) |
| Giao diện | Tailwind CSS v4 + CSS variables (design tokens), không dùng UI kit có sẵn phong cách "SaaS" |
| CSDL | PostgreSQL 16 + Prisma ORM |
| Xác thực admin | Auth.js (Credentials) + TOTP 2FA (`otplib`), băm mật khẩu `argon2` |
| Lưu trữ media | Cloudflare R2 (S3-compatible), upload trực tiếp bằng presigned URL; video lớn dùng multipart upload |
| Xử lý ảnh | `sharp` (WebP/AVIF, nhiều kích thước) |
| Video | File tự lưu trữ (MP4/WebM) hoặc nhúng YouTube/Vimeo; trích khung hình bằng `ffmpeg` (worker) |
| Email | Resend (hoặc SMTP) + `react-email` cho template; tệp lịch `.ics` bằng `ics` |
| Chống spam | Cloudflare Turnstile + rate limit (Upstash Redis hoặc bảng Postgres) + honeypot |
| i18n | `next-intl`, URL tiền tố `/en` |
| Rich text | Tiptap (admin), lưu JSON + HTML đã sanitize |
| Validation | `zod` dùng chung client/server |
| Form | `react-hook-form` |
| Job nền | Cron (Vercel Cron / node-cron) cho nhắc lịch, xuất bản hẹn giờ, ẩn danh dữ liệu |
| Kiểm thử | Vitest (unit), Playwright (E2E), `@axe-core/playwright` (a11y), Lighthouse CI |
| Hạ tầng | Vercel (web) + Neon/Supabase (Postgres) + R2; hoặc VPS Docker (xem mục 9) |
| Theo dõi | Sentry (lỗi), Plausible/Umami (truy cập, không cookie) |

**Tổng thời lượng dự kiến:** ~11 tuần cho 1–2 lập trình viên (có thể rút ngắn nếu chạy song song GĐ 3 và 4).

```
Tuần:      1    2    3    4    5    6    7    8    9    10   11
GĐ0 Setup  ██
GĐ1 Design ██████
GĐ2 Nền       ██████
GĐ3 Public          ███████████
GĐ4 Workshop             ██████████
GĐ5 Liên hệ                        █████
GĐ6 Admin      ░░░░░░░░░░░░░░░░░░░░██████   (làm dần theo từng module)
GĐ7 i18n/SEO                             █████
GĐ8 QA & Go-live                              ██████
```

---

## 1. Cấu trúc thư mục

```
tranh-dong-ho/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts                    # dữ liệu mẫu tiếng Việt
├─ public/
│  ├─ fonts/                     # Be Vietnam Pro, Playfair Display (self-host)
│  └─ textures/                  # noise giấy dó, diềm sóng nước (SVG)
├─ src/
│  ├─ app/
│  │  ├─ [locale]/(site)/        # trang công khai
│  │  │  ├─ page.tsx             # Trang chủ
│  │  │  ├─ gioi-thieu/ lich-su/ thu-vien-tranh/[slug]/
│  │  │  ├─ video/[slug]/ workshop/[slug]/ workshop/tra-cuu/
│  │  │  ├─ nghe-nhan/[slug]/ san-pham/ tin-tuc/[slug]/
│  │  │  ├─ tham-quan/ hoi-dap/ lien-he/ tim-kiem/
│  │  │  └─ chinh-sach-bao-mat/ dieu-khoan/
│  │  ├─ admin/                  # không i18n, chỉ tiếng Việt
│  │  │  ├─ login/ (dashboard)/ video/ workshop/ dang-ky/ hop-thu/
│  │  │  ├─ noi-dung/ tranh/ nghe-nhan/ tin-tuc/ san-pham/ media/
│  │  │  └─ cau-hinh/ tai-khoan/ nhat-ky/
│  │  ├─ api/                    # upload presign, cron, webhook, ics
│  │  ├─ sitemap.ts  robots.ts  not-found.tsx
│  ├─ components/
│  │  ├─ ui/                     # Button, Input, Chip, Seal, Frame, Divider…
│  │  ├─ site/                   # Header, Footer, Hero, WorkshopCard, VideoCard…
│  │  └─ admin/                  # Sidebar, DataTable, MediaPicker, RichEditor…
│  ├─ lib/
│  │  ├─ db.ts auth.ts storage.ts email.ts captcha.ts rate-limit.ts
│  │  ├─ validators/             # zod schemas
│  │  ├─ services/               # registration.ts, video.ts, contact.ts… (nghiệp vụ)
│  │  └─ audit.ts slug.ts search.ts ics.ts
│  ├─ emails/                    # react-email templates
│  ├─ i18n/ (vi.json, en.json, routing.ts)
│  └─ styles/ tokens.css globals.css
├─ tests/ unit/ e2e/
├─ .env.example
└─ docker-compose.yml            # postgres + mailpit cho dev
```

Nguyên tắc: logic nghiệp vụ nằm trong `lib/services`, Server Actions/route handlers chỉ gọi service → dễ test, dễ tái dùng giữa admin và public.

---

## GĐ0 – Khởi tạo dự án (Tuần 1, ~3 ngày)

- [ ] Tạo repo, Next.js + TS strict, ESLint, Prettier, Husky + lint-staged, commitlint.
- [ ] `docker-compose.yml`: Postgres 16, Mailpit (xem email dev), MinIO (giả lập R2).
- [ ] `.env.example`: `DATABASE_URL`, `AUTH_SECRET`, `R2_*`, `RESEND_API_KEY`, `TURNSTILE_*`, `SITE_URL`, `CRON_SECRET`.
- [ ] Cài Prisma, kết nối DB, migration rỗng chạy được.
- [ ] CI GitHub Actions: lint → typecheck → unit test → build.
- [ ] Môi trường Preview (Vercel) tự deploy mỗi PR.

**Xong khi:** `docker compose up && pnpm dev` chạy được trang trắng; CI xanh.

---

## GĐ1 – Thiết kế UI & design system (Tuần 1–3)

### 1.1 Figma (song song với GĐ2)
- [ ] Chuyển 9 màn hình ở Chương 9 SRS thành Figma chi tiết, desktop 1200 + mobile 375.
- [ ] Bổ sung: chi tiết tranh, chi tiết video, tin tức, nghệ nhân, tham quan, FAQ, 404, tra cứu đăng ký, email template.
- [ ] Trạng thái: hover, focus, disabled, lỗi form, loading, rỗng (không có dữ liệu).
- [ ] Chủ đầu tư duyệt Figma → chốt.

### 1.2 Design tokens (`styles/tokens.css`)
- [ ] Màu: `--giay #F2E6CC`, `--giay-2 #E9DAB8`, `--muc #1E1A15`, `--son #B3322A`, `--hoe #D8A12E`, `--cham #2D4F4A`, `--nau #7A4E2D`.
- [ ] Chữ: Playfair Display (tiêu đề), Be Vietnam Pro (nội dung), self-host bằng `next/font/local`, subset `latin` + `latin-ext` + `vietnamese`.
- [ ] Thang cỡ chữ 64/48/34/22/17/15/13, spacing 4px base, bo góc tối đa 4px.
- [ ] Bóng "dấu in lệch": `box-shadow: 3px 3px 0 var(--muc)`.
- [ ] Texture: noise giấy dó (SVG ≤ 3KB), diềm sóng nước (SVG repeat).
- [ ] Kiểm tra tương phản toàn bộ cặp màu chữ/nền ≥ 4.5:1.

### 1.3 Thư viện component (`components/ui`)
- [ ] `Button` (primary / ghost / dark, sm/md), `Input`, `Textarea`, `Select`, `Stepper ±`, `Checkbox`, `Radio`, `Chip`.
- [ ] `Seal` (con dấu vuông – logo, số bước, nút play), `PaintingFrame` (khung tranh viền kép), `WaveDivider`, `Eyebrow`, `SectionHeading`.
- [ ] `Container`, grid 12 cột, `Breadcrumb`, `Pagination`, `Lightbox`, `Accordion`, `Toast`.
- [ ] Trang `/dev/ui` (chỉ môi trường dev) hiển thị toàn bộ component.

**Xong khi:** Figma được duyệt; `/dev/ui` hiển thị đủ component, đạt axe không lỗi.

---

## GĐ2 – Nền tảng: CSDL, auth, media (Tuần 2–4)

### 2.1 Prisma schema (theo Chương 6 SRS)
- [ ] Models: `AdminUser`, `Page`, `HistoryMilestone`, `PaintingCategory`, `Painting`, `VideoCategory`, `Video`, `Workshop`, `WorkshopSession`, `Registration`, `Artisan`, `ContactMessage`, `Post`, `Product`, `Media`, `Faq`, `HeroSlide`, `Subscriber`, `SiteSetting`, `AuditLog`.
- [ ] Enum: `ContentStatus (DRAFT|PUBLISHED|SCHEDULED)`, `VideoSource (UPLOAD|YOUTUBE|VIMEO)`, `SessionStatus (OPEN|CLOSED|CANCELLED)`, `RegStatus (WAITLIST|NEW|CONFIRMED|ATTENDED|NO_SHOW|CANCELLED)`, `ContactTopic`, `ContactStatus`.
- [ ] Trường song ngữ: cặp `titleVi/titleEn`, `descriptionVi/descriptionEn`…
- [ ] Index: `slug` unique; `Registration(sessionId,status)`; `Registration(code)` unique; `Video(status,publishedAt)`.
- [ ] Full-text search: cột `tsvector` + extension `unaccent` (tìm không dấu – FR-GEN-02).
- [ ] `seed.ts`: 1 admin, 5 mốc lịch sử, 5 dòng tranh, 20 tranh, 8 video, 2 workshop × 6 buổi, 1 nghệ nhân, 6 tin, 10 FAQ, cấu hình site.

### 2.2 Xác thực admin (FR-ADM-01)
- [ ] Auth.js Credentials, session JWT 8 giờ, cookie `httpOnly`, `secure`, `sameSite=lax`.
- [ ] `argon2id` băm mật khẩu; khóa 15 phút sau 5 lần sai (lưu `failedAttempts`, `lockedUntil`).
- [ ] 2FA TOTP: bật/tắt, QR code, mã khôi phục.
- [ ] Quên mật khẩu: token 1 lần, hết hạn 30 phút.
- [ ] Middleware chặn `/admin/**` và mọi Server Action admin (kiểm tra lại session ở server, không tin client).
- [ ] CLI `pnpm admin:create email` để tạo admin đầu tiên.

### 2.3 Media (FR-ADM-08)
- [ ] `POST /api/upload/presign`: kiểm tra quyền, loại MIME, dung lượng → trả presigned URL R2.
- [ ] Ảnh: sau upload → job `sharp` tạo biến thể 320/640/1024/1600 WebP + AVIF, lưu `variants` JSON.
- [ ] Bắt buộc `altVi` khi lưu Media.
- [ ] Component `<Img>` dùng `srcset` từ variants, lazy-load, `blurDataURL`.
- [ ] Kiểm tra magic bytes (không chỉ đuôi file).

### 2.4 Tiện ích dùng chung
- [ ] `audit.ts`: ghi `AuditLog` cho mọi thao tác tạo/sửa/xóa admin (FR-ADM-11).
- [ ] `slug.ts`: bỏ dấu tiếng Việt (`đ → d`), chống trùng (`-2`, `-3`).
- [ ] `rate-limit.ts`, `captcha.ts` (verify Turnstile phía server).
- [ ] `email.ts`: gửi + retry 3 lần + ghi log trạng thái gửi.

**Xong khi:** đăng nhập admin (có 2FA) chạy; upload ảnh lên R2 và sinh biến thể; seed chạy sạch; test unit cho slug, auth lock, presign.

---

## GĐ3 – Trang công khai (Tuần 4–7)

Thứ tự ưu tiên theo SRS (Cao trước). Mỗi trang: SSG/ISR (`revalidate` theo tag khi admin sửa), metadata + Open Graph, JSON-LD phù hợp.

### 3.1 Layout chung
- [ ] Top bar (giờ mở cửa, hotline, VI/EN), Header dính, thu gọn khi cuộn; menu mobile toàn màn hình (FR-HOME-01).
- [ ] Footer: địa chỉ, bản đồ nhỏ, giờ mở cửa, MXH, form bản tin, chính sách (FR-HOME-07).
- [ ] Nút liên hệ nhanh Zalo/Gọi nổi trên mobile (FR-ART-04).

### 3.2 Trang chủ `/` (FR-HOME-02…06)
- [ ] Hero bất đối xứng + cụm tranh so le; slider ≤ 3 slide, ≥ 7s, nút tạm dừng, tắt khi `prefers-reduced-motion`.
- [ ] Dải số liệu; Workshop sắp diễn ra (3 buổi, thanh chỗ còn lại); Video mới (4); Tranh tiêu biểu (6); Tin tức (3); Lời nghệ nhân.
- [ ] Hiệu ứng "in màu từng lớp" khi ảnh tranh vào khung nhìn (IntersectionObserver, CSS).

### 3.3 Giới thiệu & Lịch sử (FR-HIS-01…05)
- [ ] `/gioi-thieu`: trang tĩnh rich text + gallery.
- [ ] `/lich-su`: timeline ngang (desktop, cuộn bằng nút + bàn phím) / dọc (mobile); modal chi tiết mốc.
- [ ] Quy trình 5 bước + bảng màu tự nhiên; các dòng tranh liên kết sang thư viện đã lọc.

### 3.4 Thư viện tranh (FR-GAL-01…03)
- [ ] `/thu-vien-tranh`: lưới, lọc theo dòng tranh (query string `?dong=`), tìm theo tên, "Tải thêm".
- [ ] `/thu-vien-tranh/[slug]`: lightbox + zoom, chữ trên tranh + phiên âm + nghĩa, tranh liên quan, nút "Liên hệ đặt tranh" → `/nghe-nhan/...?chu-de=dat-tranh&tranh=slug`.

### 3.5 Video (FR-VID-01…04)
- [ ] `/video`: chip danh mục, video ghim hiển thị lớn, lưới thumbnail + tiêu đề + thời lượng.
- [ ] `/video/[slug]`: player HTML5 (file tự lưu, có phụ đề `.vtt`) hoặc YouTube dạng "lite embed" (chỉ tải iframe khi bấm play – tăng hiệu năng).
- [ ] Đếm lượt xem: gọi API sau 10s phát, chống lặp 30 phút bằng cookie ẩn danh/khóa localStorage.
- [ ] JSON-LD `VideoObject`.

### 3.6 Nghệ nhân, Sản phẩm, Tin tức, Tham quan, FAQ, Tìm kiếm
- [ ] `/nghe-nhan/[slug]`: hồ sơ, tác phẩm, video liên quan (form liên hệ làm ở GĐ5).
- [ ] `/san-pham`: catalog, nút "Liên hệ đặt mua" (FR-GEN-04).
- [ ] `/tin-tuc`, `/tin-tuc/[slug]` (FR-GEN-03), JSON-LD `Article`.
- [ ] `/tham-quan`: bản đồ nhúng (tải khi cuộn tới), giờ mở cửa, đường đi (FR-GEN-05), JSON-LD `LocalBusiness`.
- [ ] `/hoi-dap` accordion (FR-GEN-06); `/tim-kiem` nhóm kết quả theo loại (FR-GEN-02).
- [ ] Trang 404/500 thiết kế riêng (FR-GEN-09).

**Xong khi:** toàn bộ trang hiển thị từ dữ liệu seed, responsive 360–1440px, Lighthouse trang chủ ≥ 90 ở cả 4 mục trên Preview.

---

## GĐ4 – Workshop & đăng ký (Tuần 5–8) – module rủi ro cao nhất

### 4.1 Hiển thị
- [ ] `/workshop`: danh sách + chế độ lịch tháng; badge Còn chỗ / Sắp hết (≤ 20%) / Hết – nhận chờ / Đã đóng (FR-WS-01).
- [ ] `/workshop/[slug]`: thông tin, chính sách hủy, ảnh buổi trước, danh sách buổi (FR-WS-02). JSON-LD `Event` cho từng buổi.

### 4.2 Form đăng ký (FR-WS-03)
- [ ] Desktop 1 trang; mobile 3 bước (chọn buổi → thông tin → xác nhận), thanh tổng tiền cố định đáy.
- [ ] Zod schema dùng chung: họ tên 2–80 ký tự, SĐT VN (`^(0|\+84)(3|5|7|8|9)\d{8}$`) hoặc quốc tế (`libphonenumber-js`), email, người lớn ≥ 1, tổng ≤ 10, checkbox đồng ý bắt buộc.
- [ ] Turnstile + honeypot + rate limit 5 lần/10 phút/IP.

### 4.3 Service `createRegistration` (FR-WS-04, BR-01…03, BR-05)
- [ ] Chạy trong transaction `SERIALIZABLE` (hoặc `SELECT … FOR UPDATE` trên `WorkshopSession`):
  1. Khóa buổi, kiểm tra `status=OPEN` và chưa quá `registerDeadline`.
  2. Tính số chỗ đã dùng = tổng (adults+children) của đăng ký `NEW|CONFIRMED`.
  3. Kiểm tra BR-02 (≤ 2 đăng ký hiệu lực / SĐT / buổi).
  4. Đủ chỗ → `NEW`; thiếu → `WAITLIST`.
  5. Sinh mã `DH-MMDD-XXXX` (4 số ngẫu nhiên, retry nếu trùng).
- [ ] Retry tự động khi lỗi serialization (tối đa 3 lần).
- [ ] Unit test + **test đồng thời**: 20 request song song cho 5 chỗ cuối → đúng 5 thành công, còn lại vào WAITLIST.

### 4.4 Sau khi đăng ký (FR-WS-05, 07)
- [ ] Trang xác nhận có mã đăng ký, nút "Thêm vào lịch" (`/api/ics/[code]`), "Xem đường đi".
- [ ] Email xác nhận (react-email, VI/EN theo ngôn ngữ khách) kèm `.ics`, hướng dẫn thanh toán; email báo admin.
- [ ] Cron mỗi giờ: gửi nhắc lịch cho đăng ký `CONFIRMED` có buổi trong 23–25 giờ tới (đánh dấu `remindedAt` để không gửi lặp).

### 4.5 Tra cứu, hủy, danh sách chờ (FR-WS-06, BR-04)
- [ ] `/workshop/tra-cuu`: nhập mã + SĐT (rate limit chặt, không tiết lộ mã nào tồn tại).
- [ ] Hủy khi còn ≥ X giờ (cấu hình, mặc định 24).
- [ ] Khi có chỗ trống: mời người `WAITLIST` đầu tiên phù hợp số người, giữ chỗ 12 giờ (token xác nhận qua email); hết hạn → mời người tiếp theo (cron).
- [ ] Admin hủy cả buổi → hủy hàng loạt + email thông báo gợi ý buổi khác.

**Xong khi:** E2E Playwright đi hết luồng đăng ký → email (Mailpit) → tra cứu → hủy → người chờ được mời; test đồng thời pass.

---

## GĐ5 – Liên hệ nghệ nhân, liên hệ chung, bản tin (Tuần 8)

- [ ] Form liên hệ nghệ nhân (FR-ART-02): chip chủ đề, điền sẵn tranh từ query string, nội dung 20–2000 ký tự, đính kèm ≤ 3 ảnh ≤ 5MB (upload presign vào thư mục tạm, chuyển chính thức khi gửi).
- [ ] Sau gửi (FR-ART-03): lưu `ContactMessage(status=NEW)`, email xác nhận cho khách, email báo admin (≤ 1 phút).
- [ ] `/lien-he`: form chung dùng cùng component (không gắn nghệ nhân).
- [ ] Bản tin (FR-GEN-07): double opt-in, link hủy đăng ký bằng token.
- [ ] Banner cookie chỉ khi bật analytics có cookie (FR-GEN-10).

**Xong khi:** E2E gửi liên hệ có ảnh → tin nhắn hiện trong DB/hộp thư admin, 2 email tới Mailpit.

---

## GĐ6 – Trang quản trị (xây dần từ Tuần 3, hoàn thiện Tuần 8–9)

Làm song song: mỗi module public xong thì làm luôn phần admin tương ứng.

### 6.1 Khung admin
- [ ] Layout sidebar (theo Hình 9.7 SRS), badge số đăng ký mới/tin chưa đọc.
- [ ] Component `DataTable` (lọc, tìm, sắp xếp, phân trang server-side, chọn nhiều), `MediaPicker`, `RichEditor` (Tiptap), `BilingualTabs` (VI/EN), `StatusSelect`, `ConfirmDialog`.
- [ ] Nút "Xem trước" dùng Next.js Draft Mode.

### 6.2 Dashboard (FR-ADM-02)
- [ ] 4 KPI: đăng ký mới, % lấp đầy buổi gần nhất, danh sách chờ, khách tham gia tháng; tin nhắn chưa đọc; lượt xem video 30 ngày; lối tắt tạo nhanh.

### 6.3 Video (FR-ADM-03)
- [ ] Form: tiêu đề VI/EN, slug tự sinh (sửa được), mô tả rich text, nguồn (radio upload / link).
- [ ] Upload file: multipart upload R2 từ trình duyệt, thanh tiến trình, tiếp tục khi rớt mạng (lưu uploadId + parts đã xong), giới hạn 500MB, MP4/WebM.
- [ ] Sau upload: job `ffmpeg` đọc thời lượng, trích 3 khung hình (10%, 40%, 70%) làm gợi ý thumbnail.
- [ ] Link YouTube/Vimeo: parse ID, lấy thumbnail mặc định (oEmbed), cho phép thay ảnh riêng.
- [ ] Thumbnail: upload + cắt 16:9 (`react-easy-crop`) hoặc chọn khung hình.
- [ ] Danh mục, thẻ, phụ đề `.vtt`, trạng thái Nháp/Đăng/Hẹn giờ (cron mỗi 5 phút xuất bản), ghim nổi bật.
- [ ] Sau lưu: `revalidateTag('videos')` để trang chủ/trang video cập nhật ngay.

### 6.4 Workshop & Đăng ký (FR-ADM-04, 05)
- [ ] CRUD Workshop; CRUD Buổi, "Nhân bản theo tuần" (chọn số tuần), đóng/mở/hủy buổi.
- [ ] Bảng đăng ký theo Hình 9.8: lọc buổi/trạng thái/ngày, tìm tên-SĐT-mã, đổi trạng thái đơn lẻ/hàng loạt, ghi chú nội bộ, gửi lại email.
- [ ] Xuất Excel (`exceljs`) / CSV; in danh sách điểm danh (trang print CSS).

### 6.5 Hộp thư (FR-ADM-06)
- [ ] Danh sách theo chủ đề/trạng thái, xem đính kèm, ghi chú nội bộ, trả lời nhanh qua email (lưu lịch sử trả lời).

### 6.6 Nội dung (FR-ADM-07)
- [ ] CRUD: Trang tĩnh, Mốc lịch sử (kéo thả sắp xếp – `dnd-kit`), Tranh, Dòng tranh, Nghệ nhân, Tin tức, Sản phẩm, FAQ, Banner hero.

### 6.7 Hệ thống (FR-ADM-09…12)
- [ ] Cấu hình site (key–value, form có nhóm): liên hệ, giờ mở cửa, MXH, SEO mặc định, số giờ được hủy, tài khoản ngân hàng, mẫu email.
- [ ] Tài khoản admin: mời qua email, vô hiệu hóa, đổi mật khẩu, 2FA.
- [ ] Nhật ký thao tác: lọc theo người/ngày/đối tượng.
- [ ] Xuất danh sách bản tin.

**Xong khi:** người không chuyên (chủ đầu tư) tự đăng 1 video có thumbnail trong ≤ 3 phút sau 1 lần hướng dẫn (NFR-08); mọi thao tác admin có trong nhật ký.

---

## GĐ7 – Song ngữ, SEO, hiệu năng (Tuần 9–10)

- [ ] `next-intl`: `vi` mặc định, `/en/...`; dịch toàn bộ chuỗi giao diện (`en.json`); nội dung chưa dịch → hiện bản Việt + ghi chú (FR-GEN-01). Nút VI/EN giữ nguyên trang.
- [ ] Slug: dùng chung slug tiếng Việt cho cả 2 ngôn ngữ (đơn giản, tránh trùng lặp).
- [ ] `sitemap.ts` (đa ngôn ngữ, hreflang), `robots.ts`, canonical, Open Graph image động (`next/og`) theo phong cách site.
- [ ] JSON-LD: Event, VideoObject, Article, LocalBusiness, BreadcrumbList (NFR-06).
- [ ] Hiệu năng (NFR-01): ảnh AVIF/WebP, `priority` cho ảnh hero, font preload + `font-display: swap`, lite YouTube embed, bundle analyzer, JS trang public < 150KB gzip.
- [ ] Header bảo mật (NFR-04): CSP (cho phép YouTube, Turnstile, R2), HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

**Xong khi:** Lighthouse CI ≥ 90 (Performance/Accessibility/SEO/Best Practices) cho `/`, `/workshop/[slug]`, `/video`; Google Rich Results Test hợp lệ cho Event & VideoObject.

---

## GĐ8 – Kiểm thử, nhập nội dung, go-live (Tuần 10–11)

### 8.1 Kiểm thử
- [ ] Unit (Vitest): validators, slug, service đăng ký, tính tiền, quy tắc hủy, sinh mã, rate limit. Độ phủ service ≥ 80%.
- [ ] E2E (Playwright): trang chủ, lọc tranh, xem video, đăng ký → xác nhận → tra cứu → hủy, danh sách chờ, liên hệ, admin đăng nhập + 2FA, đăng video, đổi trạng thái đăng ký, xuất Excel.
- [ ] A11y: axe trên mọi trang public = 0 lỗi nghiêm trọng; kiểm tra bàn phím thủ công; kiểm tra với trình đọc màn hình (VoiceOver/NVDA) ở form đăng ký.
- [ ] Trình duyệt/thiết bị (NFR-02): Chrome, Safari, Firefox, Edge; iPhone Safari, Android Chrome; màn hình 360px.
- [ ] Tải: k6 – 100 người dùng đồng thời đăng ký cùng 1 buổi, không vượt sức chứa.
- [ ] Bảo mật: thử truy cập admin API không session, upload file giả MIME, XSS trong rich text, brute-force đăng nhập.

### 8.2 Nội dung thật
- [ ] Nhận từ chủ đầu tư: ảnh tranh (chụp đều sáng, nền trung tính), ảnh ván khắc, chân dung nghệ nhân, video, tư liệu lịch sử đã kiểm chứng, bản dịch tiếng Anh.
- [ ] Nhập liệu (hoặc script import từ Excel), kiểm tra alt text đầy đủ.
- [ ] Soát chính tả tiếng Việt toàn site.

### 8.3 Go-live
- [ ] Mua/cấu hình tên miền, DNS, SSL; email domain (SPF, DKIM, DMARC) để email không vào spam.
- [ ] Production DB + backup hằng ngày giữ 30 bản; thử khôi phục 1 lần (NFR-07).
- [ ] Sentry, Umami/Plausible, uptime monitor (UptimeRobot/Better Stack).
- [ ] Cron production: nhắc lịch (mỗi giờ), xuất bản hẹn giờ (5 phút), hết hạn giữ chỗ danh sách chờ (15 phút), ẩn danh dữ liệu > 24 tháng (hằng tuần – NFR-05).
- [ ] Google Search Console + gửi sitemap; Google Business Profile trỏ về website.
- [ ] Đào tạo admin 1 buổi + tài liệu hướng dẫn ngắn (PDF/video quay màn hình).
- [ ] Nghiệm thu theo checklist Chương 10 SRS.

---

## 9. Phương án hạ tầng

| | Phương án A – Managed (khuyến nghị) | Phương án B – VPS |
|---|---|---|
| Web | Vercel | VPS 2 vCPU/4GB + Docker + Caddy |
| DB | Neon / Supabase Postgres | Postgres trong Docker + backup lên R2 |
| Media | Cloudflare R2 | Cloudflare R2 |
| Cron | Vercel Cron | node-cron / systemd timer |
| ffmpeg | Worker riêng (Railway/Fly) hoặc chỉ dùng YouTube cho video | Chạy trực tiếp trên VPS |
| Ưu | Ít vận hành, preview mỗi PR | Chi phí cố định thấp, toàn quyền |
| Nhược | Chi phí tăng theo lưu lượng | Tự lo bảo trì, cập nhật, bảo mật |

Gợi ý tiết kiệm: video dài để trên YouTube (nhúng), chỉ tự lưu clip ngắn < 2 phút.

---

## 10. Rủi ro & cách giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Đăng ký vượt sức chứa khi đồng thời | Cao | Transaction + khóa hàng + test tải (GĐ4.3) |
| Email vào spam → khách không nhận mã | Cao | SPF/DKIM/DMARC, domain gửi riêng, mã hiện ngay trên màn hình |
| Chậm có nội dung thật (ảnh, bản dịch) | Cao | Chốt danh sách nội dung ở Tuần 1, deadline giao nội dung Tuần 8 |
| Upload video lớn thất bại | TB | Multipart + resume; khuyến khích YouTube cho video dài |
| Giao diện bị "template/AI" | TB | Duyệt Figma theo checklist "Nên/Tránh" Chương 8 SRS trước khi code |
| Spam form | TB | Turnstile + rate limit + honeypot |
| Admin không quen công nghệ | TB | UI admin đơn giản, hướng dẫn tại chỗ, đào tạo, video hướng dẫn |

---

## 11. Definition of Done (áp dụng cho mọi task)

- [ ] Code qua lint, typecheck, test; có test cho logic nghiệp vụ.
- [ ] Responsive 360 → 1440px; không cuộn ngang.
- [ ] Bàn phím dùng được, focus rõ, axe 0 lỗi nghiêm trọng.
- [ ] Có trạng thái loading / rỗng / lỗi.
- [ ] Chuỗi hiển thị nằm trong file i18n (không hard-code).
- [ ] Đúng design tokens, không màu/bo góc/bóng ngoài hệ thống.
- [ ] Thao tác admin ghi AuditLog; input server-side đều validate bằng zod.
- [ ] Được review và deploy lên Preview để chủ đầu tư xem.

---

## 12. Mốc bàn giao cho chủ đầu tư

| Mốc | Tuần | Bàn giao |
|---|---|---|
| M1 | 3 | Figma đã duyệt + trang `/dev/ui` |
| M2 | 6 | Bản Preview: toàn bộ trang public với dữ liệu mẫu |
| M3 | 8 | Luồng workshop + liên hệ chạy thật (email thật) |
| M4 | 9 | Trang admin đầy đủ – chủ đầu tư bắt đầu nhập nội dung |
| M5 | 10 | Song ngữ + SEO + báo cáo Lighthouse |
| M6 | 11 | Go-live + đào tạo + tài liệu hướng dẫn |
