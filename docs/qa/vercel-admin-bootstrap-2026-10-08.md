# Bootstrap admin Vercel — 08/10/2026

Phạm vi FR-ADM-01 (SRS p.10), ENG-23, OPS-02/03, QA-02/07. Bản gốc `38a745e`; không đổi UI/schema, ngưỡng mật khẩu, stack, baseline hoặc reset DB. Chỉ thay validation/bootstrap và tài liệu; giữ thay đổi người dùng ở `src/components/share.tsx` ngoài commit.

## Nguyên nhân đã xác định

Log do chủ dự án cung cấp, build Production `main/38a745e` lúc 22:55 ngày 08/10 (Asia/Ho_Chi_Minh): environment config validated, Prisma Client generated, committed migrations applied, seed/import idempotent giữ dữ liệu. Build dừng ở `First deployment requires INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (20+ characters)`. Kết luận: DB chưa có admin và ít nhất một trong hai biến không hợp lệ; log gốc chưa phân biệt email sai hay password sai. Không phải lỗi install warnings hoặc yêu cầu nâng major Prisma.

CI bản gốc [run 37669961720](https://github.com/vansec0812/prjTranhDongHo/actions/runs/37669961720): Linux `vercel-build` và Windows `local-prototype` đều success, giữ báo cáo audit với ngoại lệ demo đã được chủ dự án cho phép. CI fixture không kiểm kết nối provider hay thông tin admin trên Vercel.

## Sửa và kiểm tra

- `validateInitialAdmin`: chỉ kiểm credentials khi chưa có admin; trim/chữ thường cho email, giữ nguyên password; lỗi nêu riêng tên biến/ràng buộc và môi trường Production, không in giá trị.
- Bootstrap validate sau migration tạo bảng và trước seed/import. Tạo admin vẫn transaction/advisory lock, Argon2id và audit; redeploy giữ account/hash và không cần lại credentials.
- Integration trên schema UUID riêng trong `dongho_test`: thiếu email, thiếu/short/placeholder password không tạo admin/audit; email có khoảng trắng/chữ hoa được chuẩn hóa; hai request đồng thời tạo đúng một admin; password xác minh đúng và giữ nguyên qua redeploy.

| Lệnh / kiểm tra | Kết quả local |
| --- | --- |
| `npm.cmd run test:prepare` | PASS; hai migration, không pending |
| `npm.cmd test` | PASS 51/51 test, 9 file |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run format:check` | PASS |
| `node scripts/check-rules.mjs`, `git diff --check` | PASS |
| `npm.cmd run build` | PASS Next.js 15.5.27 |

Không đổi UI nên không tạo ảnh/baseline mới. Password-only handoff đã chuẩn bị riêng dưới `.local`, không đưa vào Git hoặc log; dùng giá trị 32 ký tự đã có, không xoay các khóa mã hóa/auth/provider.

## Phần cần hoàn tất trên Vercel

Sửa `INITIAL_ADMIN_EMAIL` thành email thật dạng địa chỉ và `INITIAL_ADMIN_PASSWORD` Secret 20–200 ký tự cho **Production**, Save, rồi deploy commit mới nhất trên `main`. Chrome từ chối công cụ truy cập Vercel do quyền chặn đã lưu; chưa sửa trực tiếp dashboard. Public hiện tại vẫn trả 500 trên deployment cũ thiếu `DATABASE_URL`; chưa báo cloud smoke hoặc đăng nhập mới PASS. Không bỏ bước tạo admin để che lỗi cấu hình.
