# Cập nhật ảnh, nội dung và tour · 03/10/2026

Phạm vi: yêu cầu sourceImage/sourceVR, bỏ ghi chú SRS/prototype trên public, tóm tắt ảnh và chi tiết; PDF VR bổ sung 19 trang. Stack và các luật đặt chỗ được giữ. Không deploy/public hoặc thêm dịch vụ phí. Chưa nghiệm thu toàn hệ thống production.

## Nội dung và UI

- 9 tranh gốc, 10 ảnh trưng bày và 4 HEIC được chuyển WebP/JPEG, bỏ metadata. 23 SHA-256 nguồn đã đối chiếu: không thay đổi nguồn. Manifest `public/tour/assets.json` ghi dung lượng/kích thước; các variant đều dưới ngân sách PDF p.8.
- Import CMS transaction/một lần có backup; không đổi buổi, giá hoặc đăng ký. Ẩn template cũ, giữ redirect; ảnh, mô tả VI/EN, bài viết và trang chi tiết dùng CMS. Không tự gán chữ Hán/Nôm, niên đại, cm, giá hoặc hồ sơ nghệ nhân.
- Desktop hover/focus hiện tóm tắt; mobile đọc bên dưới ảnh. Gallery/detail/lightbox/liên hệ đúng tranh và catalog detail được E2E kiểm. Tranh contain, giữ palette/fonts/ba tranh hero so le; không sinh tranh AI.
- Tour bốn góc nhìn có canvas thật, zoom, chuyển điểm/đường về, drawer/thumbnails/lộ trình, info dialog/painting links, fullscreen, URL/VI–EN, reduced-motion và fallback ảnh khi không WebGL. Công cụ tọa độ dev-only trả 404 ở production build.
- Không có MP3: nút thuyết minh disabled kèm lý do. Không tạo audio/địa điểm giả để nhận đủ yêu cầu.

## Kiểm tra

| Lệnh / bằng chứng | Kết quả đã chạy |
|---|---|
| `npm.cmd run build` | PASS; Prisma generate, compile, lint/type validation, routes |
| `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run format:check` | PASS |
| `npx.cmd prisma validate`, `node scripts/check-rules.mjs` | PASS; schema, bảy màu, token/link/type/localStorage rules |
| `npm.cmd test` | 20/20 unit/integration, PostgreSQL test riêng; gồm giá/trạng thái/giờ, transaction/concurrency/hold/outbox và static media/path traversal |
| `npm.cmd run test:e2e` | 16/16; lần cuối 1,6 phút, không retry/skip/nới timeout. Hai baseline showcase 375/1440 giữ nguyên, diff 0 |
| `node scripts/verify-hydration.mjs` | 30 lần tải VI/EN home/gallery, handler menu thật và chunk không sửa; 0 lỗi |
| `node scripts/verify-source-ui.mjs` | 60 trường hợp public VI/EN/admin, 360/375/768/1200/1440; xem JSON cuối cùng. Ảnh 375/1440 đã xem bằng mắt |
| `node scripts/verify-tour-network.mjs` | Mobile 375, 1.600 kbps/150ms/CPU×4, cold cache trước tour; viewer engine tải trên home: 0. Kết quả tải ghi ở JSON |
| `node scripts/performance-review.mjs --source-update` | Lighthouse mobile/4G mặc định, production build; xem report cuối. Không coi build/axe là đạt Performance ≥90 |
| `npm audit --audit-level=moderate` | BLOCKED: 5 high trong một chuỗi lint, `braces <=3.0.3`; không đổi ngưỡng/major/override |

Lần chạy đồng thời trước đó có 14 PASS và hai timeout tải/đăng nhập; chạy riêng hai ca PASS, sau đó toàn bộ 16 PASS với ngưỡng nguyên vẹn. Báo cáo lỗi hydrate ban đầu giữ ở `ui-before-hydration-fix.json`; sửa Intro/ranh giới nạp main, không suppress cảnh báo hoặc patch thư viện. Loading giữ chỗ cho viewport để footer không nhảy lên trước nội dung. Nguồn giải thích cơ chế phù hợp với diagnostics local: [React issue 37584](https://github.com/react/react/issues/37584), đây là đối chiếu triệu chứng, không xác nhận mọi lỗi đến từ upstream.

## Ảnh và truy vết

Trước: `../vi-home-375.png`, `../vi-home-1440.png`, `../vi-thu-vien-tranh-375.png`, `../vi-thu-vien-tranh-1440.png`. Sau: `home-375.png`, `home-1440.png`, `thu-vien-tranh-375.png`, `thu-vien-tranh-1440.png`, `tham-quan-360-375.png`, `tham-quan-360-1440.png`, các trang EN/detail/admin cùng thư mục. Không mask hoặc đổi baseline showcase.

Repository chưa có Git/remote: commit=null; `../source-manifest.json` nhận diện source cuối bằng SHA-256, `before-source-manifest.json` giữ source trước. JSON UI ghi route/locale/state/viewport; thời gian và dữ liệu workshop là dữ liệu vận hành local, không dùng các ảnh này thay baseline visual bất biến. Font self-host; Chromium emulation, chưa nhận kiểm máy thật/Safari/Firefox/Edge hay zoom/WCAG review đầy đủ.

## Giới hạn nghiệm thu

PDF cần chín điểm cầu 2:1, còn nguồn hiện tại là bốn panorama quét ngang trong một gian trưng bày. Viewer giới hạn phần đã chụp, FOV/directions chỉ là trình bày cần khảo sát. Chưa đạt tour làng chín điểm, hướng đi địa lý, bản đồ làng hoặc thuyết minh VI/EN. Gyroscope đã có tùy chọn/quyền nhưng chưa kiểm trên iOS/Android thật; chưa đo FPS trên điện thoại tầm trung.

NFR-VR-01 chưa đạt toàn bộ: ảnh xem trước dưới 2s, ảnh nét và chuyển điểm đã tải trước còn quá ngưỡng 5s/1s ở profile đo. NFR-VR-03 xác minh không tải engine trên home, nhưng Lighthouse ≥90 xét riêng report. Không giảm throttling hoặc chỉ lấy mẫu thuận lợi để nhận PASS.

Đo cuối: preview tour 1,33s, ảnh nét 8,08s (trước ưu tiên tải: 12,25s), chuyển điểm đã tải trước 1,69s; các số là cận trên gồm thao tác đo/render của Chromium CPU×4. Home Performance/Accessibility/SEO 80/100/69, LCP 4,42s, CLS 0; workshop 69/100/58, LCP 4,84s, CLS 0. NFR-01 vẫn IN_PROGRESS, không báo đạt ngưỡng. Noindex của môi trường local được giữ, không đổi APP_MODE hoặc robots để nâng SEO. Chưa đo mạng/thiết bị production thật.

Quyền phát hành ảnh/chân dung tư liệu, địa chỉ/giờ/liên hệ và chính sách cần chủ cơ sở duyệt. Không có video thật để lấp các thẻ video; hiển thị empty state. Mail/storage local được ghi rõ ở admin/docs; SMTP/R2/scanner/Turnstile production, backup/restore/uptime và CI remote chưa được nghiệm thu. Không coi bản local này là production đã sẵn sàng.

Dependency gate: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), chưa có bản vá được công bố lúc kiểm tra. Chi tiết `dependency-audit.json`; CI giữ audit gate và bị chặn ở đó cho tới khi có phương án hợp lệ.
