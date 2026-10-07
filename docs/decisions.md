# Quyết định và điểm cần chốt

## ADR — ngoại lệ phát hành demo môn học, 08/10/2026

- RESOLVED theo yêu cầu trực tiếp của chủ dự án: “Không quan trọng bảo mật, cứ deploy cho tôi”, chỉ demo môn học, không sử dụng lại, cần link Vercel public. Cho phép đưa bản chuẩn bị vào `main` và deploy prototype dù audit dependency đang thất bại. Đây là ngoại lệ cụ thể theo GOV-04, thay điều kiện chặn phát hành của GOV-02/QA-07/OPS-04 cho bản demo này; không xác nhận nghiệm thu production hoặc gọi lỗ hổng đã sửa.
- Phạm vi triển khai: giữ `npm audit --audit-level=moderate` trong CI, đặt riêng bước audit thành `continue-on-error` với nhãn ngoại lệ demo. Giữ nguyên kiểm tra format/lint/typecheck/build/unit/integration/E2E/UI, baseline và báo cáo audit. Không chạy `npm audit fix --force`, nâng major hoặc tạo phiên bản vá giả.
- Rủi ro còn biết: 5 high trong chuỗi dependency lint có `braces <=3.0.3` (GHSA-vfj7-8cjw-p6xm), chưa có bản vá upstream. Không hạ CAPTCHA/quyền admin, đưa secret vào Git, reset/drop database hay thêm dịch vụ trả phí. Giữ profile `vercel-prototype`, migration đã commit và bootstrap idempotent; thông tin provider thật vẫn lấy từ Vercel Production.
- Các ADR/BLOCKED audit trước ngày này được giữ làm lịch sử. Ngoại lệ không áp dụng cho việc dùng lại hệ thống làm dịch vụ production thật.

## ADR — prototype qua dashboard Vercel, 04/10/2026

- RESOLVED theo yêu cầu mới: bỏ nhu cầu terminal của người deploy. Profile `vercel-prototype` explicit với `APP_MODE=prototype`, Vercel Production environment và `BOOTSTRAP_DEMO=true` áp dụng migration đã commit, seed/import một lần, tạo admin từ env khi DB trống admin. Không bootstrap Preview hoặc app production. Quyết định này thay phần build-không-migrate của ADR trước **chỉ với opt-in prototype**; giữ nguyên schema/invariant và cấm reset/drop DB người dùng.
- RESOLVED: hỗ trợ alias Neon `DATABASE_URL_UNPOOLED`; direct client pool 1 giữ advisory lock suốt bootstrap. Marker lưu DB, backup importer lưu JSON riêng trong SiteSetting cloud, không ghi filesystem trên Vercel; lần sau không seed lại/nắn ngày/đổi mật khẩu CMS.
- RESOLVED: thêm adapter object storage Vercel Blob private để cấu hình qua Vercel dashboard, giữ adapter R2 cũ. Không đổi framework/ORM/auth/i18n. Key object UUID được validate, file private phục vụ qua API phân quyền. SDK 2.8.0 pin trong lockfile; không tự tạo store/phát sinh chi phí.
- RESOLVED: người dùng chọn email thật. Resend HTTP API có acknowledgement/idempotency theo ID outbox; gửi sau transaction, provider lỗi giữ PENDING/FAILED. Local capture bị cấm trong cloud profile. Key Turnstile thật vẫn kiểm server; không dùng test key hoặc bypass CAPTCHA.
- RESOLVED: Argon2id dùng implementation Node.js 24.7+ để tránh npm native DLL bị Windows Application Control chặn. Giữ PHC `$argon2id$v=19`, memory 65536 KiB/time 3/parallelism 1, salt ngẫu nhiên 16 byte/hash 32 byte. Không đổi mật khẩu cũ; verify giới hạn tham số hợp lệ/chống DB value gây allocation quá mức. Nguồn [Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoargon2algorithm-parameters-callback); cần E2E đăng nhập tài khoản cũ để chứng minh tương thích.
- RESOLVED: cron GET Bearer secret (constant-time), admin trigger kiểm session/origin, cả hai chạy service/DB lease dùng chung. Request form đợi xử lý mail có giới hạn sau commit, không dùng timer giữ job trong web process. Chỉ chọn session cần hết hold/đóng/mời có chỗ thay vì khóa mọi session OPEN.
- RESOLVED: ảnh nguồn mỗi ảnh ≤5 MB/3 ảnh được browser chuẩn hóa WebP ≤1.2 MB/ảnh trước request, server vẫn validate bytes thực. Giữ form khi xử lý/upload lỗi; không giảm hợp đồng giới hạn gốc để tránh giới hạn body 4.5 MB của Vercel. Video lớn vẫn cần upload trực tiếp/resumable, chưa tự nhận xong.
- OPEN/BLOCKED: prototype decode/normalize ảnh, không chứng nhận antivirus; app production giữ scanner fail closed. Hobby cron mỗi ngày không nghiệm thu nhắc lịch đúng 24 giờ/hold release theo phút. Cloud provider/email/domain/scanner/backup/restore/smoke chưa kiểm bằng credential thật. Các gate production cũ vẫn giữ.
- BLOCKED CI: `braces <=3.0.3`, advisory GHSA-vfj7-8cjw-p6xm chưa có phiên bản vá; eslint-config-next 16.3.8 vẫn dùng fast-glob, nên nâng major không giải quyết. Không downgrade major, patch/override báo sạch giả hay giảm audit gate. [Advisory chính thức](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Source chỉ được review như thay đổi chuẩn bị, chưa xác nhận release production.

## ADR — DB cloud/Vercel, 04/10/2026

- RESOLVED theo yêu cầu chủ dự án: chuẩn bị PostgreSQL cloud và build Vercel, giữ Prisma 6.19.3, schema và toàn bộ invariant workshop. Không thêm nhà cung cấp hoặc dịch vụ phí.
- RESOLVED: DATABASE_URL pooled cho runtime; DIRECT_URL direct/session cho CLI. Nhận alias integration Vercel cũ, ưu tiên tên mới. CLI local fallback DATABASE_URL; cloud yêu cầu TLS và direct URL riêng. Prisma config engine classic, không đổi sang adapter/major mới.
- RESOLVED: build Vercel kiểm config và generate Client; không tự migrate/seed. Migration deploy riêng sau backup. Setup demo từ chối URL cloud; test override cả URL runtime/direct sang dongho_test.
- RESOLVED: Vercel không dùng APP_MODE prototype với các adapter ghi file local; giữ production guard, không giả email/scan hoặc bỏ CAPTCHA. Pool default 1 trên Vercel, giữ giá trị explicit để điều chỉnh theo tải.
- OPEN: chưa có provider/credential DB cloud hoặc tài khoản Vercel để kiểm kết nối/deploy thật. Không tự copy DB local, tạo DB ngoài hoặc đưa credential vào Git.
- BLOCKED release toàn hệ thống: các integration/worker/scanner, backup/restore, nội dung/chính sách và audit đã ghi trước vẫn cần xác minh. Xem hướng dẫn [Vercel](vercel.md) và bằng chứng QA DB.

## RESOLVED

- Giữ Next.js 15/React 19, Tailwind 4 và Prisma/PostgreSQL theo plan; lock phiên bản tương thích. Không dùng major upgrade do thông báo công cụ gợi ý.
- Windows không có Docker: embedded-postgres cung cấp PostgreSQL 16 thật cho prototype, không thay bằng SQLite/localStorage. Adapter giới hạn loopback và không reset DB.
- Local mail capture, media persistence và Turnstile official test key có nhãn, không báo đã gửi email thật hoặc đã scan antivirus. Production fail closed.
- Hợp đồng AGENTS mục 3 thắng ví dụ plan: phone quốc tế, nhóm >15 chỉ hiện liên hệ đoàn, child chiếm chỗ, FIFO không vượt nhóm đầu, hold riêng.
- Tài liệu PDF thực tế là `SRS_Website_Tranh_Dong_Ho.pdf` ở root (29 trang); không bịa file tên `(2)`. Tài liệu gốc được giữ nguyên.
- Cập nhật theo yêu cầu mới: dùng 9 ảnh trong `sourceImage`, 10 ảnh khu trưng bày và 4 panorama trong `sourceVR`. Giữ ảnh gốc và SHA-256, chuẩn hóa WebP/JPEG và bỏ metadata. Chưa tự xác nhận bản quyền để công khai.
- Dependency `uuid` của ExcelJS dùng bản vá 11.1.1; [release của tác giả](https://github.com/uuidjs/uuid/releases/tag/v11.1.1) và [advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Không hạ mức audit hay bỏ kiểm tra để xanh.

## OPEN / BLOCKED trước nghiệm thu

- Chủ dự án chưa phê duyệt baseline thiết kế/Figma. Baseline tự đối chiếu SRS chương 8–9 chỉ là bằng chứng triển khai.
- Cần ảnh, video và quyền sử dụng; hồ sơ nghệ nhân thật, nguồn tư liệu lịch sử/màu, địa chỉ/giờ/liên hệ/bank chính xác và bản dịch được duyệt.
- Cần SMTP/R2/scanner/Turnstile thật để xác minh integration production. Không tự đăng ký dịch vụ trả phí.
- Chính sách bảo mật/điều khoản là bản mẫu CMS; chưa được duyệt pháp lý và chưa đối chiếu quy định VN để release.
- Upload video 500MB/resume/frame/VTT, CMS drag-drop/crop và các gates test/vận hành chưa có đủ bằng chứng. Preview bản lưu đã có qua route admin kiểm quyền; chưa có token preview chia sẻ. Không gọi đây là phiên bản production hoàn chỉnh.
- Repository ban đầu chưa có Git remote hoặc branch protection; không thể bật required checks từ máy local. CI workflow chỉ có thể xác minh khi chạy trên remote.

## ADR — nội dung nguồn và tour, 03/10/2026

- RESOLVED: giữ stack. Photo Sphere Viewer core/markers/autorotate/visible-range/gyroscope cùng 5.15.1, npm local, không CDN/dịch vụ phí. `heic-convert` chỉ dùng khi chuẩn bị ảnh.
- RESOLVED: PDF bổ sung cho phép demo dùng `public/tour/tour.json`, chưa làm admin tour. VI `/tham-quan-360`, EN `/en/virtual-tour`; helpers chung cho canonical/menu/ngôn ngữ/sitemap.
- RESOLVED: không có trả lời câu hỏi tùy chọn về 4/9 điểm; triển khai 4 nguồn ảnh hiện có. Tên điểm mô tả gian trưng bày, không giả cổng làng/xưởng chưa chụp. Không tạo ảnh AI/nối giả thành kín cầu.
- RESOLVED: import CMS có bản sao `.local/content-backups`, transaction và marker một lần. Không reset DB/đổi đăng ký/giá/buổi. Template được ẩn, URL tranh cũ có redirect. Hồ sơ mới giới thiệu nghề và mô hình trưng bày; không bịa tiểu sử/danh hiệu cá nhân.
- RESOLVED: mô tả dựa vào ảnh quan sát được; không đoán chữ Hán/Nôm, niên đại, cm, giá hay tồn hàng. Trường thiếu có lời mời liên hệ.
- Nguồn lịch sử: [IRCI — nghiên cứu Đông Hồ 2013–2015](https://www.irci.jp/research/endangeredich/vietnam2013-2015/). Thay mốc thế kỷ minh họa bằng nội dung truyền thống/Tết và mốc nghiên cứu có nguồn. Không thêm danh hiệu chưa kiểm chứng.
- OPEN: panorama không có góc/hình cầu đầy đủ. `horizontalFov:240` là cấu hình trình bày ảnh quét ngang, không phải góc đo địa vật. Viewer giới hạn phần đã chụp và FOV theo chiều cao thật. Cần ảnh kín cầu 2:1/khảo sát để nghiệm thu 9 điểm, hướng mũi tên vật lý và góc vào điểm.
- OPEN: không có MP3. Audio opt-in có đường cấu hình, nút disabled kèm lý do; chưa coi thuyết minh/âm thanh thực là PASS.
- OPEN: quyền ảnh/tư liệu, chính sách và thông tin vận hành cần duyệt. Không gán `scanStatus=CLEAN` giả; ảnh local dùng `DECODED_LOCAL`.
- BLOCKED: audit mới báo advisory `braces <=3.0.3` qua chuỗi lint Next. Không downgrade major hay giảm ngưỡng CI để che cảnh báo; xem QA cập nhật.
- RESOLVED triển khai, cần bằng chứng tải lặp: DOM diagnostics ghi cursor đã ở trong `main`/`div` khi React định claim chính host đó. Triệu chứng khớp [React issue 37584](https://github.com/react/react/issues/37584), chưa phải kết luận mọi lỗi đều do upstream. Tách Intro thành component client với props công khai tối thiểu và đặt Suspense quanh children của main; giữ SSR, không suppress lỗi, không patch dependency. `verify-hydration.mjs` kiểm 30 lần tải bằng các chunk thật, không dùng instrumentation để lấy PASS.
