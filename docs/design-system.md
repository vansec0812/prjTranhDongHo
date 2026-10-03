# Baseline thiết kế prototype

Nguồn: AGENTS.md v1.0 UI-01–30; SRS chương 8 (trang 15–16), chương 9 (trang 18–24). Đây là baseline triển khai tự đối chiếu, **chưa phải phê duyệt của chủ dự án/Figma**.

Tokens duy nhất tại `src/styles/tokens.css`: bảy màu khóa, spacing 4/8/12/16/24/32/48/64/96, cỡ chữ khóa, radius 2px, viền 1/2px, bóng cứng 3px, chuyển động 250ms. Playfair Display và Be Vietnam Pro self-host qua Fontsource, đủ subset Vietnamese và Latin.

Hero desktop chia 12 cột, ba khung so le ±3°; mobile xếp dọc. Dải số liệu nền mực; ngày workshop nền chàm; CTA đỏ son. Admin dùng sidebar mực và cùng tokens. Focus đỏ son 3px. Menu/lightbox dùng native dialog để quản lý focus và Esc.

Ngày 03/10/2026, ảnh public chuyển sang chín tranh từ `sourceImage` và ảnh trưng bày từ `sourceVR`. Tranh dùng `contain`, giữ màu gốc; không sinh tranh AI hoặc gán ảnh mô hình trưng bày cho một nghệ nhân. `public/demo/*.svg` giữ lại làm tài nguyên fixture lịch sử, nội dung tương ứng đã chuyển nháp. Không hiển thị ghi chú SRS/prototype trên public. Quyền phát hành ảnh và thông tin vận hành vẫn cần chủ cơ sở xác nhận trước công khai.

`MediaView` có tóm tắt khi hover/focus; mobile hiển thị tóm tắt bên dưới ảnh để đọc mà không cần hover. Thẻ dẫn tới nội dung chi tiết, lightbox giữ và trả focus. Hero vẫn ba tranh so le ±3°. Trang catalog bổ sung chi tiết từng tranh, không thêm checkout.

Tour dùng cùng bảy màu, focus/viền/bóng cứng và nút 44px. Các kích thước khối tour được khai báo trong `tokens.css`; `tour.css` chứa bố cục riêng. Ảnh toàn cảnh giữ màu thật, chữ điều khiển trên nền giấy đặc. Danh sách vị trí và popup dùng dialog; giảm chuyển động dừng tự xoay. Tour hiện có bốn ảnh quét ngang, giới hạn góc nhìn theo vùng ảnh để tránh dựng trần/sàn không có trong nguồn. Sơ đồ là lộ trình bốn điểm, chưa là bản đồ địa lý làng.

Gates: type/lint/build, kiểm tra token, axe, overflow 360/375/768/1200/1440, ảnh 375/1440 public VI/EN và admin. Baseline visual chỉ tạo sau lần kiểm tra đầu, không tự coi là đã được duyệt. Bằng chứng và trạng thái tại `docs/qa/`.
