# Điều hướng thẻ nội dung bằng bàn phím — 08/10/2026

Phạm vi FR-GAL-01/02, UI-20/24/25/27/28, QA-05/07. Parent commit `b89990a`; thay đổi nguồn chỉ ở `src/components/content-card.tsx`. Không đổi CSS, token, dữ liệu, test assertion, timeout, fixture, baseline hoặc dung sai visual test. Thay đổi riêng của người dùng ở `src/components/share.tsx` không thuộc commit này.

## Tái hiện và thay đổi

CI [run 37667171637](https://github.com/vansec0812/prjTranhDongHo/actions/runs/37667171637) đạt build Linux và 17/18 E2E Windows. Test thẻ tranh nhận focus rồi Enter không tới `/thu-vien-tranh/dam-cuoi-chuot` trong 5 giây. Đã tái hiện local bằng 15 context browser mới: một lần không chuyển trang mặc dù active element là anchor có href đúng; không có pageerror. Chưa kết luận nguyên nhân nội bộ Next.js.

Thẻ nội dung dùng anchor native để Enter/click điều hướng qua trình duyệt, không phụ thuộc client router/prefetch. Vẫn render SSR, giữ href đúng locale, DOM/class/style, tóm tắt hover/focus/mobile và đường dẫn chi tiết. Không thêm handler mô phỏng Enter hoặc tắt kiểm tra lỗi.

## Kiểm tra bản sửa

- `npm run build`, lint, typecheck, kiểm tra token/rule và `git diff --check`: PASS.
- `npm run test:e2e`: PASS 18/18 trên bản build sửa, gồm mở tranh bằng Enter, lightbox/trả focus, liên hệ đúng tranh, workshop, newsletter, admin, tour và showcase/a11y. Đây là local adapter; không xác nhận provider cloud.
- [keyboard-after.json](keyboard-after.json): PASS 15/15 context mới với focus và Enter, cùng hạn chờ 5 giây; không pageerror.
- [before.json](before.json) và [after.json](after.json): mỗi bản kiểm 15 tổ hợp route/viewport, public VI/EN và admin login ở 360/375/768/1200/1440px. HTTP 200, một H1, không tràn ngang và không pageerror. Before phục vụ build parent chưa sửa; after phục vụ build có patch native anchor, chưa commit khi chụp nên metadata vẫn ghi parent.
- Chụp trước/sau ở 375/1440px và xem ảnh thật. [visual-comparison.json](visual-comparison.json): năm cặp ảnh giống hoàn toàn; thư viện VI 1440 có 7 pixel khác giá trị tối đa 2 đơn vị màu tại viền cong trường tìm kiếm (`x=120..121`, `y=647..700`), kích thước/position và nội dung không đổi. Các giá trị được giữ nguyên trong [changed-pixels.json](changed-pixels.json) để review; không mask hoặc đổi baseline/tolerance. Không phát hiện thay đổi bố cục/thiết kế khóa.

## Cloud chưa đạt

Commit `b89990a` đã được push lên main theo ngoại lệ demo môn học của chủ dự án. GitHub Vercel status báo deployment `dpl_4Zu6ZccQn3BqjJES2gnf4oLbtbwc` thất bại; cần đúng log deployment này. Người dùng cung cấp một đoạn log có `Deployment completed`, nhưng chưa đối chiếu được commit của đoạn đó. Khi smoke, domain public vẫn trả `/` và các route nội dung HTTP 500, health HTTP 503; admin login HTTP 200. Không gọi public deploy thành công. Quyền browser Vercel bị từ chối, không đổi env qua đường vòng.
