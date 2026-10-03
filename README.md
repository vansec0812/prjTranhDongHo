# Website Văn hóa Tranh Đông Hồ

Prototype có public VI/EN, CMS `/admin`, PostgreSQL, đăng ký workshop với transaction, hộp thư và worker/outbox. Thiết kế theo bảng màu, kiểu chữ và mockup của các tài liệu gốc trong repository. Trạng thái nghiệm thu chi tiết: [requirements-matrix](docs/requirements-matrix.md).

## Chạy demo trên máy này

Yêu cầu Node.js 24 và npm. Trong PowerShell tại `D:\prjTranhDongHo`:

```powershell
npm.cmd ci
npm.cmd run setup:demo
npm.cmd run demo
```

Mở **http://127.0.0.1:3000**; quản trị **http://127.0.0.1:3000/admin/login**. Tài khoản đầu tiên và mật khẩu ngẫu nhiên nằm trong `.local/demo-access.txt`, không đưa vào Git. Setup không reset DB, không ghi đè `.env`, không đổi mật khẩu đã có. PostgreSQL 16 cục bộ ở cổng 54329, dữ liệu bền vững tại `.local/postgres`.

Chạy bản tối ưu: dừng cả web và worker bằng Ctrl+C trước `npm.cmd run build` (Windows khóa DLL Prisma khi các tiến trình đang dùng); chạy `npm.cmd start`, mở terminal khác chạy `npm.cmd run worker`. PostgreSQL vẫn cần hoạt động. Chi tiết và cách dừng PostgreSQL ở [runbook](docs/runbook.md).

## Nội dung và tích hợp demo

Thư viện sử dụng 9 ảnh trong `sourceImage`; ảnh khu trưng bày và 4 panorama lấy từ `sourceVR`. Ảnh được chuyển định dạng, bỏ metadata và giữ nguyên bản nguồn. Tranh có mô tả VI/EN trong CMS, chi tiết/zoom và liên hệ đúng tranh. Hover/focus hiển thị tóm tắt; mobile đọc tóm tắt ngay dưới ảnh. Các thẻ tranh/video/hồ sơ giả lập trước đây được ẩn, không xóa lịch sử hay dữ liệu người dùng. Chưa có video thực tế được cung cấp; admin có thể thêm nguồn được phép.

Tour: **http://127.0.0.1:3000/tham-quan-360**, EN **http://127.0.0.1:3000/en/virtual-tour**. Có kéo/swipe, zoom, chọn điểm, lộ trình, hotspot, fullscreen, keyboard, deep link `?diem=`, giữ điểm khi đổi VI/EN và fallback ảnh nếu không có WebGL. Photo Sphere Viewer chỉ tải khi mở tour. Nội dung trong `public/tour/tour.json`; không thêm admin tour, kính VR hay mô hình 3D. Panorama hiện tại là ảnh quét ngang, không phải ảnh kín cầu 2:1. Không tạo giả vùng trần/sàn hoặc điểm chưa có ảnh. Chưa có MP3 nên thuyết minh disabled kèm lý do.

```powershell
# Chạy lại khi nguồn ảnh thay đổi:
npm.cmd run assets:prepare
# Nhập một lần; lần sau giữ chỉnh sửa CMS:
npm.cmd run content:import
# Công cụ tọa độ chỉ hoạt động với next dev:
# http://127.0.0.1:3000/dev/hotspot-picker?diem=phong-tranh
```

Thông tin cơ sở, chính sách, bản quyền và hình học của tour cần xác nhận trước phát hành công khai. UI public đã bỏ ghi chú SRS/prototype; trạng thái tích hợp local vẫn thể hiện tại admin và tài liệu.

Email local được worker ghi vào `.local/mail` và hiển thị tại `/admin/email`; **không gửi ra Internet**. Turnstile dùng test key chính thức, vẫn kiểm tra server qua Cloudflare. Ảnh tải lên được decode, kiểm MIME/magic bytes, nén WebP và lưu bền vững ở `.local/media`; chế độ local chưa phải chứng nhận quét antivirus. Production chặn test key, fixtures và cấu hình thiếu tích hợp thật.

## Các luồng demo

1. Thư viện tranh → tìm/lọc → chi tiết → zoom → liên hệ điền sẵn tranh.
2. Workshop → chọn buổi → thông tin/consent → đăng ký → nhận mã → tra cứu/ICS/hủy. Hết chỗ nhận cả nhóm vào danh sách chờ; worker gửi lời mời khi đủ chỗ.
3. Admin → nội dung VI/EN/nháp → preview bản đã lưu → đăng bài; quản lý buổi và đăng ký, xác nhận/bulk/CSV/XLSX/điểm danh; hộp thư, media, cấu hình hero/số liệu, tài khoản và audit.
4. Bản tin → email xác nhận local → xác nhận một lần → hủy nhận tin.

## Kiểm tra

```powershell
npm run test:prepare
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
# Khi web đang chạy:
npm run test:e2e
node scripts/verify-ui.mjs
node scripts/verify-source-ui.mjs
```

Integration dùng DB riêng `dongho_test`, không reset/xóa DB demo. E2E thao tác thật trên site demo với thông tin dành cho kiểm thử `example.invalid`; không dùng PII thật. Báo cáo [docs/qa](docs/qa/). Không coi local adapter, build pass hoặc ảnh chụp là nghiệm thu production.

Các yêu cầu chưa hoàn tất (upload video 500MB/resume/frame/VTT, CMS kéo thả/crop, đầy đủ kiểm thử bảo mật/cross-browser, JSON-LD, vận hành và tích hợp ngoài) được ghi riêng trong ma trận, không bị loại khỏi phạm vi. Không triển khai public hoặc phát sinh chi phí. Bằng chứng kiểm tra và giới hạn: [review](docs/qa/review.md).
