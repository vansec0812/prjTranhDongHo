# Vercel Function startup và Blob OIDC — 08/10/2026

Phạm vi OPS-02/04, NFR-09, QA-07; bản gốc `a3095eb`. Không đổi UI/schema, auth upload, Blob SDK, secrets hoặc baseline.

## Bằng chứng và lỗi code

Log chủ dự án cung cấp cho build Production `a3095eb` lúc 23:28–23:31 (Asia/Ho_Chi_Minh) xác nhận migrate, seed/import, chuẩn bị admin, Next build và deployment hoàn tất. GitHub status success tại deployment `9ZJUTnfPvhpfSqtbmdMZKnSYnTib`; CI [run 37807388293](https://github.com/vansec0812/prjTranhDongHo/actions/runs/37807388293) success. Public `/`, `/api/health`, `/admin/login` vẫn HTTP 500; health trả trang HTML 500 thay vì handler JSON 503, phù hợp lỗi trước handler nhưng chưa có private Runtime Logs để kết luận toàn bộ nguyên nhân cloud.

Lỗi code đã tái hiện: startup `instrumentation.register()` gọi `productionGuard`, đòi `BLOB_STORE_ID` kèm biến `VERCEL_OIDC_TOKEN` khi không dùng read/write token. [Vercel](https://vercel.com/docs/environment-variables/system-environment-variables) cấp OIDC token qua header context từng request ở Function runtime; biến môi trường có khi build. Source SDK đang cài `@vercel/oidc` đọc context rồi fallback env; Blob SDK lấy identity đó trước mỗi operation. Token chưa có tại startup không chứng minh binding Blob thiếu.

Test mới với Vercel + store binding, không env OIDC/read-write token: bản gốc FAIL `Missing private Vercel Blob connection`; bản sửa PASS. Guard kiểm binding lúc khởi động trên Vercel, giữ yêu cầu credential bên ngoài Vercel. `put/get/del` vẫn dùng SDK private và xác thực thực, không chấp nhận token do guest tự gửi hoặc bỏ quyền upload.

## Kiểm tra local

| Kiểm tra | Kết quả |
| --- | --- |
| `npm.cmd test` | PASS 52/52, 9 file |
| Lint / typecheck / format / rule checks / diff checks | PASS |
| `npm.cmd run build:vercel` với environment fixture CI, bootstrap false | PASS; không truy cập DB/provider thật hoặc sửa dữ liệu |
| Gọi `register()` của `.next/server/instrumentation.js` đã biên dịch với OIDC env trống + store binding | PASS |

Hai lần full test trước đó có một test CLI migrate status timeout 5 giây; 51 test khác pass. Probe giữ cùng runtime-unreachable/direct-test-DB xác nhận CLI exit 0, schema up-to-date, thời gian khoảng 6.080s rồi 2.877s. Chạy lại full suite sau probe PASS với nguyên timeout/assertions; không sửa test đó, giảm tải workshop hoặc bỏ checks. Ghi hiện tượng timing biến động của CLI local, chưa quy nguyên nhân cho một dịch vụ cụ thể.

CI thêm bước gọi startup của bản đã biên dịch không có token theo request, ngoài build fixture cũ. Không đổi các checks chức năng/audit exception đã được chủ dự án cho phép. Không đổi UI nên không tạo baseline/ảnh mới.

Cloud smoke sau bản sửa và Blob upload thật chưa xác minh tại thời điểm commit. Runtime Logs private vẫn bị quyền Chrome chặn. Không gọi build fixture hoặc unit PASS là chứng minh provider/website public đã hoạt động.

## Sau deploy — đêm 08/10 và 00:09 ngày 09/10/2026

Commit sửa `96ae4d4` được push trực tiếp lên `main`. [Deployment 522Ldecyv6Y4DyVZYLE1bHFopnDi](https://vercel.com/seczxjemathest-s-projects/prj-tranh-dong-ho/522Ldecyv6Y4DyVZYLE1bHFopnDi) success. [CI run 37812468711](https://github.com/vansec0812/prjTranhDongHo/actions/runs/37812468711) có cả Linux `vercel-build` (bao gồm bước startup mới) và Windows `local-prototype` success. Ngoại lệ audit demo vẫn được báo, không coi advisory đã sửa.

- HTTP public `/`, `/admin/login` và `/api/health` đều 200; health JSON `status: ready`, mode prototype. `/api/auth/csrf` 200 JSON, không lưu token/cookie trong bằng chứng.
- 19 route thêm trong [HTTP smoke](vercel-oidc-public/http-smoke.json), gồm VI/EN, tranh/chi tiết, lịch sử, workshop/tra cứu, liên hệ, tour và chính sách: 200, một H1. Mười URL ảnh tối ưu của trang chủ trả 200 và nội dung image.
- [Browser smoke](vercel-oidc-public/browser-smoke.json): home/gallery 375 và 1440px, ảnh đã tải, không tràn ngang hoặc pageerror. Đã xem ảnh thật của thư viện desktop và home mobile; không đổi baseline/UI.
- [Tour smoke](vercel-oidc-public/tour-smoke.json): canvas WebGL hiện, trạng thái ready, chọn điểm 2 đổi URL `?diem=mau-va-giay`, không pageerror; ảnh đã xem trong `_tham-quan-360-1440.png`. Chromium dùng software WebGL, không thay xác minh thiết bị/kính VR.

Một lượt helper chờ *mọi* image trên tour timeout: diagnostic cho thấy ảnh modal đang ẩn, lazy và chưa được request, trong khi preview/thumbnail hiện đều tải. Giữ kết quả riêng của bốn lượt home/gallery; tour được kiểm bằng trạng thái ready/canvas và thao tác chuyển điểm thực. Không tăng timeout, đổi test E2E hoặc mask ảnh để báo pass.

Lỗi 500 toàn site đã được khắc phục và link public hoạt động trong smoke nêu trên. Chưa kiểm đăng nhập bằng account cloud, gửi email/Blob upload thật, backup/restore hay toàn bộ nghiệm thu SRS. Không gọi readiness và public smoke là nghiệm thu tất cả tính năng.
