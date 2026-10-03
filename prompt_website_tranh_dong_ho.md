# PROMPT XÂY DỰNG WEBSITE "VĂN HÓA TRANH ĐÔNG HỒ"

## 0. Vai trò
Bạn là một kỹ sư full-stack kiêm nhà thiết kế giao diện có gu, am hiểu văn hóa Việt Nam. Hãy xây dựng hoàn chỉnh một website giới thiệu và quảng bá **văn hóa tranh dân gian Đông Hồ** (làng Đông Hồ, Bắc Ninh) theo đặc tả dưới đây. Làm việc theo từng giai đoạn, sau mỗi giai đoạn chạy được và kiểm tra được.

## 1. Mục tiêu sản phẩm
- Kể câu chuyện về tranh Đông Hồ: lịch sử hình thành, chất liệu (giấy dó, điệp), màu tự nhiên, kỹ thuật khắc ván và in, các dòng tranh và ý nghĩa.
- Là kênh để nghệ nhân/cơ sở đăng video, tin tức, lịch workshop.
- Cho khách tham quan đăng ký workshop trải nghiệm in tranh **mà không cần tạo tài khoản**.
- Cho khách liên hệ trực tiếp với nghệ nhân (hỏi đáp, đặt tranh, hợp tác, báo chí).
- Song ngữ Tiếng Việt (mặc định) và English cho khách quốc tế.

## 2. Phân quyền (chỉ 2 vai trò)
1. **Khách vãng lai (Guest)** – không đăng nhập. Được: xem mọi nội dung đã xuất bản, tìm kiếm, xem video, đăng ký workshop, gửi liên hệ, đăng ký nhận bản tin, chia sẻ lên mạng xã hội, đổi ngôn ngữ.
2. **Quản trị viên (Admin)** – đăng nhập tại `/admin` (email + mật khẩu, tùy chọn 2FA TOTP). Toàn quyền quản lý nội dung, video, workshop, đăng ký, hộp thư liên hệ, cấu hình site. Có thể có nhiều tài khoản admin ngang quyền; mọi thao tác ghi nhật ký (audit log).
- Không có đăng ký tài khoản công khai. Khách tra cứu đăng ký workshop bằng **mã đăng ký + số điện thoại**.

## 3. Sơ đồ trang (public)
- `/` Trang chủ
- `/gioi-thieu` Giới thiệu làng tranh & cơ sở
- `/lich-su` Lịch sử hình thành (timeline) + Quy trình làm tranh
- `/thu-vien-tranh` Thư viện tranh (lọc theo dòng tranh) · `/thu-vien-tranh/[slug]` chi tiết tranh
- `/video` Thư viện video · `/video/[slug]` trang xem video
- `/workshop` Lịch workshop · `/workshop/[slug]` chi tiết + đăng ký · `/workshop/tra-cuu` tra cứu/hủy đăng ký
- `/nghe-nhan` Danh sách nghệ nhân · `/nghe-nhan/[slug]` hồ sơ + form liên hệ
- `/san-pham` Tranh bán/đặt làm (catalog, "Liên hệ đặt mua", KHÔNG có giỏ hàng/thanh toán)
- `/tin-tuc` Tin tức & sự kiện · `/tin-tuc/[slug]`
- `/tham-quan` Thông tin tham quan: bản đồ, giờ mở cửa, đường đi, giá vé
- `/hoi-dap` FAQ · `/lien-he` Liên hệ chung · `/tim-kiem?q=`
- `/chinh-sach-bao-mat`, `/dieu-khoan`
- Tiền tố `/en/...` cho bản tiếng Anh.

## 4. Chức năng chi tiết

### 4.1 Trang chủ
- Hero dạng bố cục chia đôi: tiêu đề lớn + mô tả ngắn + 2 CTA ("Đăng ký workshop", "Khám phá lịch sử"); bên phải là cụm 3 bức tranh đặt so le. Admin đổi được ảnh/tiêu đề hero (tối đa 3 slide, không tự chạy nhanh hơn 7 giây, có nút tạm dừng).
- Khối số liệu nổi bật (admin nhập).
- "Workshop sắp diễn ra" (3 buổi gần nhất, hiện số chỗ còn lại).
- "Video mới" (4 video), "Tranh tiêu biểu" (6 tranh), "Tin tức", "Lời nhắn nghệ nhân" (trích dẫn), bản đồ + giờ mở cửa, đăng ký bản tin.

### 4.2 Lịch sử & Giới thiệu
- Timeline theo mốc (admin CRUD: năm/giai đoạn, tiêu đề, mô tả, ảnh). Desktop: cuộn ngang có mũi tên; mobile: dọc.
- Quy trình 5 bước: Giấy dó & quét điệp → Chế màu tự nhiên (đen than lá tre, đỏ sỏi son, vàng hoa hòe, xanh lá chàm/gỉ đồng, trắng vỏ điệp) → Khắc ván → In từng màu (mỗi màu một ván) → Phơi & hoàn thiện. Mỗi bước có ảnh/clip ngắn.
- Các dòng tranh: chúc tụng, sinh hoạt, lịch sử, truyện tích, thờ cúng — mỗi dòng có trang mô tả.

### 4.3 Thư viện tranh
- Lưới ảnh có lọc theo dòng tranh, màu chủ đạo, và tìm theo tên. Chi tiết tranh: ảnh phóng to (zoom/lightbox), tên, câu chữ Hán-Nôm trên tranh (nếu có) + phiên âm + dịch nghĩa, ý nghĩa, kích thước, tranh liên quan, nút "Liên hệ đặt tranh này" (mở form liên hệ đã điền sẵn tên tranh).

### 4.4 Video (admin đăng tải)
- Admin tạo video với: **tiêu đề**, slug tự sinh, mô tả (rich text), **nguồn video** = (a) upload file MP4/WebM ≤ 500MB lên object storage, hoặc (b) dán link YouTube/Vimeo; **thumbnail** = upload ảnh (JPG/PNG/WebP, tỉ lệ 16:9, tự nén và tạo nhiều kích thước) hoặc chọn khung hình tự trích từ video; danh mục, thẻ, thời lượng, phụ đề .vtt (tùy chọn), trạng thái Nháp/Đã đăng/Hẹn giờ, ghim nổi bật.
- Khách: lưới video có thumbnail + tiêu đề + thời lượng + ngày; lọc theo danh mục; trang xem có trình phát, mô tả, video liên quan, chia sẻ. Đếm lượt xem.

### 4.5 Workshop
- Admin tạo Workshop (tên, mô tả, ảnh, giá người lớn/trẻ em, thời lượng, độ tuổi, địa điểm, những gì mang về) và các **Buổi** (ngày, giờ bắt đầu/kết thúc, sức chứa, hạn chót đăng ký, ngôn ngữ hướng dẫn).
- Khách đăng ký: chọn buổi → họ tên, SĐT (định dạng VN), email, số người lớn, số trẻ em, quốc tịch/ngôn ngữ, ghi chú (dị ứng, cần hỗ trợ), đồng ý chính sách dữ liệu, CAPTCHA (Cloudflare Turnstile). Chặn khi hết chỗ → cho vào **danh sách chờ**.
- Sau khi gửi: màn hình xác nhận với **mã đăng ký** (vd `DH-2610-4821`), email xác nhận kèm file .ics; nhắc lịch tự động trước 24 giờ.
- Tra cứu/hủy bằng mã + SĐT (hủy trước giờ học tối thiểu X giờ, X do admin cấu hình).
- Trạng thái đăng ký: Mới → Đã xác nhận → Đã tham gia | Vắng mặt | Đã hủy; Danh sách chờ → Mới khi có chỗ trống.
- Admin: bảng đăng ký có lọc theo buổi/trạng thái, đổi trạng thái hàng loạt, ghi chú nội bộ, xuất CSV/Excel, in danh sách điểm danh.
- Thanh toán: chỉ hiển thị hướng dẫn chuyển khoản/thanh toán tại chỗ (không tích hợp cổng thanh toán ở phiên bản 1).

### 4.6 Nghệ nhân & Liên hệ
- Hồ sơ nghệ nhân: ảnh chân dung, danh hiệu, tiểu sử, câu chuyện nghề, tác phẩm tiêu biểu, video liên quan.
- Form liên hệ nghệ nhân: chủ đề (Hỏi đáp về tranh / Đặt tranh / Hợp tác – giáo dục / Báo chí – phỏng vấn / Khác), họ tên, email, SĐT, nội dung, đính kèm ảnh (≤ 3 ảnh, ≤ 5MB). Gửi xong hiển thị cảm ơn + gửi email xác nhận cho khách và thông báo cho admin.
- Nút liên hệ nhanh: gọi điện, Zalo, Messenger (link cấu hình được).

### 4.7 Khác
- Tin tức & sự kiện (bài viết, danh mục, ảnh bìa, SEO).
- Sản phẩm: catalog tranh bán, giá tham khảo, trạng thái còn hàng, nút "Liên hệ đặt mua".
- Tìm kiếm toàn site (tranh, video, bài viết, workshop).
- Bản tin: đăng ký email (double opt-in), admin xuất danh sách.
- FAQ dạng accordion; trang Tham quan với Google Maps embed.
- Chia sẻ Facebook/Zalo/copy link; Open Graph đầy đủ.
- Trang 404 có thiết kế riêng.

### 4.8 Trang quản trị `/admin`
- Dashboard: số đăng ký mới, buổi workshop sắp tới & tỉ lệ lấp đầy, tin nhắn chưa đọc, lượt xem video 30 ngày.
- CRUD: Trang tĩnh, Mốc lịch sử, Tranh, Dòng tranh, Video, Danh mục video, Workshop, Buổi, Đăng ký, Nghệ nhân, Tin tức, Sản phẩm, FAQ, Banner hero.
- Thư viện media dùng chung (upload kéo thả, cắt ảnh, alt text bắt buộc).
- Hộp thư liên hệ: trạng thái Mới/Đang xử lý/Đã trả lời/Lưu trữ, ghi chú nội bộ.
- Cấu hình: thông tin liên hệ, giờ mở cửa, mạng xã hội, SEO mặc định, email templates, chính sách hủy.
- Quản lý tài khoản admin, đổi mật khẩu, 2FA, nhật ký thao tác.
- Mọi nội dung có trường tiếng Việt + tiếng Anh; xem trước trước khi đăng.

## 5. Yêu cầu phi chức năng
- Responsive từ 360px; Lighthouse ≥ 90 (Performance, SEO, Accessibility); LCP < 2.5s trên 4G.
- WCAG 2.1 AA: tương phản đủ, điều hướng bàn phím, alt text, focus rõ ràng, tôn trọng `prefers-reduced-motion`.
- Bảo mật: mật khẩu băm Argon2/bcrypt, khóa tạm sau 5 lần sai, CSRF, rate limit form công khai, CAPTCHA, kiểm tra MIME file upload, header bảo mật (CSP, HSTS), HTTPS.
- Dữ liệu cá nhân: chỉ thu thập thông tin cần thiết, có checkbox đồng ý, chính sách bảo mật; tuân thủ quy định bảo vệ dữ liệu cá nhân hiện hành của Việt Nam; tự động ẩn danh dữ liệu đăng ký cũ sau 24 tháng.
- SEO: SSR/SSG, sitemap.xml, robots.txt, schema.org (Event cho workshop, VideoObject, Article, LocalBusiness), hreflang vi/en.
- Sao lưu CSDL hằng ngày, giữ 30 bản.

## 6. Công nghệ đề xuất (có thể thay đổi)
- Next.js (App Router) + TypeScript, Tailwind CSS, Prisma + PostgreSQL.
- Auth.js (Credentials) cho admin; TOTP 2FA.
- Lưu trữ media: S3-compatible (Cloudflare R2) + xử lý ảnh bằng sharp; video lớn có thể dùng Cloudflare Stream/Mux hoặc YouTube.
- Email: Resend/SMTP; CAPTCHA: Cloudflare Turnstile; i18n: next-intl.
- Soạn thảo rich text: Tiptap.

## 7. Định hướng giao diện – hiện đại, bắt mắt, KHÔNG "nhuốm màu AI"
Cảm hứng lấy trực tiếp từ vật liệu của tranh Đông Hồ, không phải từ template SaaS.

**Bảng màu (lấy từ màu tự nhiên của tranh):**
- Giấy dó / nền: `#F2E6CC`, nền phụ `#E9DAB8`
- Đen than lá tre (chữ, viền): `#1E1A15`
- Đỏ son (nhấn chính, CTA): `#B3322A`
- Vàng hòe: `#D8A12E`
- Xanh chàm: `#2D4F4A`
- Nâu gỗ ván: `#7A4E2D`
- Dùng màu phẳng như tranh in; không gradient tím/xanh, không neon.

**Chữ:** Tiêu đề: Playfair Display (hoặc Lora) — serif có chân, hỗ trợ đầy đủ dấu tiếng Việt. Nội dung: Be Vietnam Pro. Tiêu đề lớn, tương phản mạnh về cỡ chữ.

**Chi tiết tạo bản sắc:**
- Nền có vân giấy dó rất nhẹ (noise texture), lớp ánh điệp lấp lánh tinh tế ở hero.
- Khung ảnh viền đen mảnh 2–3px như khung tranh in ván; bo góc nhỏ (≤ 4px) hoặc vuông.
- Logo dạng con dấu đỏ vuông (triện) — dùng làm điểm nhấn lặp lại (bullet, số thứ tự, loader).
- Hoa văn đường diềm (sóng nước, mây) làm đường phân cách section, dùng SVG nét đơn.
- Nút: nền đỏ son phẳng, chữ giấy dó, viền đen; trạng thái hover dịch bóng đổ cứng 3px (hard shadow) như dấu in lệch.
- Bố cục bất đối xứng, lưới 12 cột, nhiều khoảng trắng; ảnh tranh đặt so le nhẹ.
- Chuyển động tiết chế: fade/slide 200–300ms, hiệu ứng "in màu từng lớp" cho ảnh tranh khi cuộn tới (lần lượt hiện lớp đen → đỏ → vàng).

**Tránh (dấu hiệu giao diện AI/template):**
- Gradient tím-xanh, glassmorphism, blob mờ, glow neon.
- Emoji làm icon; icon 3D bóng bẩy; hình minh họa người 3D.
- Hero chữ căn giữa + nền gradient + 3 card tính năng giống hệt nhau.
- Bo tròn lớn (16–24px) cho mọi thứ; bóng đổ mềm lan rộng.
- Văn bản sáo rỗng ("Khám phá thế giới...", "Trải nghiệm tuyệt vời..."): viết cụ thể, có chi tiết thật.
- Ảnh stock chung chung; ưu tiên ảnh thật của làng tranh, nghệ nhân, ván khắc.

## 8. Giai đoạn triển khai
1. Khởi tạo dự án, design tokens, layout chung (header, footer, lưới, typography), trang 404.
2. Schema CSDL + seed dữ liệu mẫu tiếng Việt.
3. Trang public: Trang chủ, Lịch sử, Thư viện tranh, Video, Nghệ nhân, Tin tức, Tham quan, FAQ.
4. Workshop: danh sách, đăng ký, xác nhận, email, tra cứu/hủy, danh sách chờ.
5. Liên hệ nghệ nhân + liên hệ chung + bản tin.
6. Admin: đăng nhập, dashboard, CRUD, upload video/thumbnail, quản lý đăng ký, hộp thư, cấu hình.
7. i18n tiếng Anh, SEO, kiểm thử a11y/hiệu năng, triển khai.

Kết quả mỗi giai đoạn: mã nguồn chạy được, hướng dẫn chạy, danh sách việc còn lại. Viết nội dung mẫu bằng tiếng Việt tự nhiên, có dấu đầy đủ.
