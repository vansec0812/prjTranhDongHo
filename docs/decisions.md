# Quyết định và điểm cần chốt

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
