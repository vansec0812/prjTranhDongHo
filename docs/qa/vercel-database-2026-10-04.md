# QA — PostgreSQL cloud/Vercel · 04/10/2026

Phạm vi yêu cầu: sửa cấu hình DB để chủ dự án deploy Vercel, commit và push. Không deploy thật, provision dịch vụ, reset/chuyển DB, thay schema/migration/UI hoặc sửa thay đổi có sẵn của chủ dự án trong `src/components/share.tsx`.

## Truy vết

| Điều khoản | Triển khai / bằng chứng | Phần chưa xác minh |
|---|---|---|
| ENG-01 | Giữ Next.js/Prisma 6.19.3/PostgreSQL; `database-config.ts`, `prisma.config.ts`; không đổi dependency version | Provider/DB cloud thật |
| ENG-23 | CLI direct/session URL; integration Prisma migrate status thành công khi URL runtime trỏ cổng không kết nối được; setup demo chặn cloud | Migration/backup trên DB cloud do chủ dự án cấp |
| OPS-02 | Hosted DB yêu cầu TLS, chặn loopback; Vercel giữ guard production, từ chối local adapters; test negative | Credentials và integrations thật; staging riêng/noindex |
| OPS-01 | Build không khởi động DB/worker/seed; `vercel.json` và hướng dẫn worker riêng | Worker/scheduler trên môi trường bền vững |
| OPS-03 | [Hướng dẫn Vercel](../vercel.md), README/runbook/ADR cập nhật | Restore/rollback/smoke production |
| QA-07 | Unit/integration/E2E/checks local dưới đây; CI giữ nguyên audit gate | Remote CI/required checks và audit còn high |

Commit source: `ff55d74` sửa DB/guard/test; `9716771` cấu hình build Vercel. Commit tài liệu kế tiếp chứa báo cáo này. Schema, migrations và các baseline ảnh không đổi. `.env`, `.local`, credential admin, các trace kiểm thử không commit.

## Kết quả đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `npm.cmd run test:prepare` | PASS; migrate vào DB riêng `dongho_test`, không reset |
| `npm.cmd test` | PASS 39/39 trong 5 file; gồm 19 ca mới về runtime/direct URL, TLS/loopback/alias/pool/error redaction, setup guard và CLI direct thật |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run format:check` | PASS |
| `npx.cmd prisma validate` | PASS |
| `node scripts/check-rules.mjs` | PASS |
| `npm.cmd run build` | PASS sau khi tạm dừng web/worker giữ DLL Prisma trên Windows |
| `npm.cmd run build:vercel` | PASS với `VERCEL=1`, APP_MODE production và URL/config tổng hợp `.example.invalid`; không liên lạc DB cloud/tích hợp thật |
| `npx.cmd playwright test tests/e2e/demo.spec.ts` | PASS 9/9, 53s, dev local; public VI/EN, admin/draft/quyền, workshop đăng ký/lookup/ICS/hủy, inbox, newsletter/worker và consent |
| `/api/health` local | HTTP 200; demo web/worker đã bật lại |
| `git diff --cached --check` | PASS cho commit code/config |
| Dependency audit | Vẫn 5 high như npm kiểm khi đồng bộ metadata engine trong lockfile; không đổi version hoặc audit gate |

Lần đầu `test:prepare` chưa chạy được vì DB local đang tắt; đã khởi động PostgreSQL hiện có rồi chạy thành công. Build đầu bị EPERM do Next dev/worker giữ DLL Prisma; đã tạm dừng đúng tiến trình demo, build thành công rồi bật lại. Không dùng lỗi môi trường làm lý do bỏ test hoặc đổi timeout.

Build Vercel mô phỏng chỉ xác minh generate/compile với cấu hình cloud. Các key/hostname của lần mô phỏng cố ý không phải credential dùng được; không coi guard hiện diện config là kiểm SMTP/R2/scanner/CAPTCHA production. Không seed/migrate trong build. E2E local dùng dữ liệu kiểm thử và adapter local như trước, không phải chứng nhận Vercel hoặc production.

Không đổi UI nên không tạo baseline ảnh mới hay chạy lại toàn bộ visual/a11y/Lighthouse. Bộ E2E source tour/visual và thiết bị thật chưa chạy lại trong tác vụ DB. Các giới hạn nghiệm thu cũ trong [review](source-update/review.md) và [ma trận](../requirements-matrix.md) giữ nguyên.
