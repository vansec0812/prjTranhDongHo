# Kiểm tra trước khi đưa code lên GitHub · 04/10/2026

Phạm vi được chủ dự án yêu cầu: tạo các commit riêng theo chức năng và push lên `https://github.com/vansec0812/prjTranhDongHo`, nhánh `main`. Repository đích chưa có lịch sử khi kiểm tra. Không force-push, deploy hoặc thay đổi các chốt nghiệm thu.

## Lịch sử theo chức năng

| Commit | Phạm vi |
|---|---|
| `e2274c5` | Quy tắc, plan, prompt và hai PDF SRS |
| `3aec42b` | Stack, lockfile, cấu hình ứng dụng và loại trừ file private |
| `65790b4` | PostgreSQL, Prisma, migration và seed demo |
| `8053815` | Xác thực admin, bảo mật API và khôi phục tài khoản |
| `ebbe1d3` | Design system, responsive shell và VI/EN |
| `b90e9c2` | Trang public, thư viện tranh, ảnh sourceImage và import nội dung |
| `a4424f5` | Workshop, transaction, waitlist, hold và worker/outbox |
| `96d2220` | Liên hệ, CAPTCHA, newsletter và consent |
| `a37dbc3` | CMS, media, quản trị workshop và xuất dữ liệu |
| `3f750c7` | Tour tương tác, sourceVR, panorama và hotspot |
| `93e2d7f` | Setup local và lệnh chạy web/worker |

Commit tiếp theo chứa kiểm thử, workflow CI, bằng chứng UI và tài liệu triển khai, bao gồm báo cáo này. Các commit được chia từ bản local hiện có; không giả lập lịch sử phát triển trước đây.

## Kiểm tra đã chạy trong lần đưa code lên GitHub

| Lệnh / kiểm tra | Kết quả |
|---|---|
| `npm.cmd run format:check` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `node scripts/check-rules.mjs` | PASS |
| `npx.cmd prisma validate` | PASS |
| `npm.cmd run test:prepare` rồi `npm.cmd test` | PASS, 20/20 unit/integration trên DB riêng `dongho_test` |
| `npm.cmd run build` | PASS |
| Đối chiếu `docs/qa/source-manifest.json` | 239/239 SHA-256 trùng với bản đã kiểm tra UI trước đó |
| Quét các file dự kiến commit | Không phát hiện giá trị secret từ `.env`/mật khẩu admin local hoặc signature private key/GitHub token/AWS access key; không có file trên 50 MiB |
| Kiểm tra ignore | `.env`, các biến thể `.env.*` trừ `.env.example`, `.local`, dependency, build và Playwright trace không vào Git |
| `git diff --cached --check` | PASS cho 11 commit chức năng; commit QA có 14 cảnh báo khoảng trắng cuối dòng trong 7 HTML do Lighthouse sinh. Giữ nguyên các report lịch sử; không có cảnh báo ở code/config/test |
| `npm.cmd audit --audit-level=moderate` | BLOCKED: 5 high, 0 critical; giữ nguyên audit gate |

Lần chạy test đầu tiên có 11 integration test thất bại vì PostgreSQL chưa chạy; 9 unit test pass. Sau khi khởi động DB local và chuẩn bị DB test, toàn bộ 20 test pass. Không reset DB, sửa fixture, bỏ test hoặc đổi ngưỡng.

Thay đổi cấu hình duy nhất để đưa lên Git là mở rộng ignore từ `.env.local` sang `.env.*` và cho phép `.env.example`; code/UI/schema/test và nguồn ảnh giữ nguyên. Không chạy lại E2E, UI, Lighthouse hoặc thiết bị thật trong tác vụ này. Bằng chứng và giới hạn trước đó ở [review cập nhật nguồn](source-update/review.md), [manifest](source-manifest.json) và [ma trận yêu cầu](../requirements-matrix.md). Các báo cáo lịch sử có `commit: null` được giữ đúng trạng thái lúc ghi nhận; bảng commit ở đây gắn bản source đã đối chiếu với lịch sử Git mới.

Push code không đồng nghĩa nghiệm thu production hoặc CI xanh. Các hạn chế dependency, hiệu năng, panorama, audio và tích hợp production vẫn giữ nguyên. Quét secret cục bộ có giới hạn; không thay thế review bảo mật đầy đủ.
