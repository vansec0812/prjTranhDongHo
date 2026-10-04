# QA — prototype Vercel/email thật, 04/10/2026

Commit source/config/test: `05cf0d2` (tích hợp cloud), `52de49d` (UI/upload), `c11795b` (QA/CI). File `src/components/share.tsx` có chỉnh sửa riêng của chủ dự án trong working tree, được giữ nguyên và không đưa vào commit này. JSON ảnh ghi base `96a59d4` + workingTree=true, không giả nhận ảnh chụp từ clean checkout commit mới.

Baseline UI lấy từ commit `96a59d4`. Before giữ nguyên sáu file giao diện tại HEAD; backend đang trong working tree để đăng nhập được bằng hash cũ. After dùng build tối ưu và client profile cloud, backend/provider vẫn local. Không nhận các ảnh hay stub HTTP là bằng chứng provider cloud. Hai lượt dùng cùng nội dung DB, worker dừng, browser clock cố định 04/10/2026 00:00 Asia/Ho_Chi_Minh, reduced-motion và font self-host; E2E mutation chạy sau khi chụp xong. Không đổi baseline showcase, tolerance, timeout, fixture hoặc giảm tải đồng thời.

## Kết quả trong phạm vi thay đổi

| Lệnh / kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| `npm test` | PASS 49/49, 8 files, lần cuối 14,22s | Unit + PostgreSQL local integration: bootstrap admin đồng thời, giữ mật khẩu, migration direct/runtime, workshop/hold/FIFO/worker và config/mail |
| `npx vitest run tests/unit/vercel-deployment.test.ts` | PASS 6/6 sau sửa kiểm placeholder embedded | Cloud profile, không local adapter, production scanner guard, Neon alias, cron và HTTP Resend stub; chưa gửi Internet |
| `npm run lint`, `npm run typecheck` | PASS | Chạy lại sau thêm E2E/QA image script |
| `npx prettier --check src scripts prisma tests *.json *.ts *.mjs` | PASS | Source/config/test, không sửa file share của người dùng |
| `npx prisma validate`, `node scripts/check-rules.mjs`, `git diff --check` | PASS | Schema, token/style/link/type rules và whitespace |
| `npm run build` | PASS | Node 24.19.0, Next 15.5.27, optimized build local, client cloud profile; Windows cần SWC native cache owner-only |
| `npx playwright test` | PASS 18/18, 1,8 phút | Guest/admin thật, hash cũ, draft, workshop/lookup/ICS/hủy, contact, newsletter local worker, VR, cron HTTP/readiness, immutable visual baseline 375/1440 |
| `node scripts/verify-vercel-ui.mjs before` / `after` | PASS 45/45 mỗi lượt | 360/375/768/1200/1440; home/contact VI/EN, login/reset và admin tranh/form/email. HTTP 200, một H1, không pageerror/overflow/axe WCAG 2.1 AA violation. JSON before/after và 36 PNG cùng folder |
| `node scripts/verify-vercel-images.mjs` | PASS | Chromium canvas thật: 3 PNG mỗi ảnh 4.328.928 bytes → WebP 1.077.496 bytes; multipart 3.235.115 bytes; >5 MB/SVG bị từ chối. Không phải Blob upload thật |
| Config + `prepare-vercel.ts` với fixtures cloud, bootstrap false | PASS | `config-simulation.json`; không gọi provider/DB, không migrate/import. CI thêm Linux build tương ứng, chưa nhận CI remote xanh |
| GitHub Actions `vercel-build` trên Ubuntu/Node 24 | PASS | Run [37178236385](https://github.com/vansec0812/prjTranhDongHo/actions/runs/37178236385), source SHA `e9cfd5a`; `npm ci` và `npm run build:vercel` với BOOTSTRAP_DEMO=false. Đây là compile trên Linux, không phải deployment/provider thật. Job Windows còn chạy khi ghi bằng chứng, toàn workflow chưa PASS |
| Trace manifests | PASS | Không có đường `.local/` trong Next nft manifests; secret/private mail không được đóng gói |
| `npm audit --json` | BLOCKED: 5 high, 0 critical | Cùng advisory braces GHSA-vfj7-8cjw-p6xm qua eslint-config-next/fast-glob/micromatch, chưa có version vá. Giữ gate audit moderate; không nâng/downgrade major hoặc override để xanh |

Đã xem trực tiếp ảnh login/contact 375 và contact/admin email 1440: copy không tràn/cắt dấu, bố cục và tokens giữ nguyên. Màn email chụp ở trạng thái collapsed, không lộ recipient/body/token; local capture có nhãn rõ. Axe không thay review keyboard/zoom/WCAG toàn hệ thống. Chromium giả lập không chứng minh Safari/iOS/Android thật.

Lần test trước đó có 48/49: Prisma CLI cold start vượt timeout 5s (8,02s) trên Windows. Sau validate/warm cache và khi không có build/dev cạnh tranh CPU, suite nguyên vẹn đạt 49/49; chưa sửa test hoặc tăng timeout. Dev E2E trước đó bị cold compile >30s; đã dừng và kiểm toàn suite trên build tối ưu. Start thiếu env SWC cache bị native-binding error; start đúng cache đã online, không đổi OS policy/ACL. Parser PHC từng chỉ nhận m,t,p; đã sửa theo tên m/t/p và kiểm password cũ m,p,t thật, không reset user.

## Chưa xác minh / chặn release

Chưa có Vercel/Neon/Blob/Resend/domain/Turnstile credential thật: migrate/bootstrap cloud lần đầu, media private qua Functions, nhận mail/ICS/reset trong inbox, cloud cron/retry và smoke domain đều BLOCKED. Không suy từ Digest 3855404833 ra nguyên nhân cụ thể khi chưa có runtime logs. Guide dùng readiness/config để khoanh vùng.

Hobby daily cron chưa đạt reminder chính xác 24h/hold release theo phút. Prototype ảnh DECODED_PROTOTYPE chưa antivirus; APP_MODE production vẫn fail closed thiếu scanner. Upload video 500MB/resume, thiếu panorama/audio nguồn, backup/restore/monitoring, nội dung/quyền/chính sách và các mục ma trận chưa PASS giữ nguyên. Không báo hoàn chỉnh production/SRS toàn hệ thống. Nhánh `codex/vercel-prototype` chỉ để review, không tự merge/publish hoặc thêm dịch vụ phí.

Hướng dẫn owner: [vercel-prototype.md](../../vercel-prototype.md); file private `.local/vercel-copy.env` đã được ignore, chỉ mở cho chủ dự án, không nằm trong bằng chứng/Git. AGENTS GOV-02/QA-07/OPS-04 giữ release BLOCKED vì audit; [advisory chính thức](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) chưa có phiên bản vá tại lúc kiểm.
