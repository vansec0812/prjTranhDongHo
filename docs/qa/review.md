# Kiểm tra prototype local — 03/10/2026

Đã đọc toàn bộ AGENTS.md v1.0, plan, prompt và 29 trang SRS. Phạm vi triển khai: public VI/EN, admin, PostgreSQL, workshop transaction, inbox/newsletter và worker local. Không thay đổi tài liệu nguồn, phạm vi ngoài v1.0 hoặc ngưỡng nghiệm thu. Đây là kết quả kiểm tra local, **chưa phải nghiệm thu toàn hệ thống/production**.

## Nhận diện bản kiểm tra

Repository chưa có Git/remote nên chưa có commit để dẫn. [source-manifest.json](source-manifest.json) chứa SHA-256 của source, cấu hình, migration, test và tài liệu nguồn. Web được đo bằng `next build` + `next start`, PostgreSQL 16 thật ở local; integration chạy DB riêng `dongho_test`. Font self-host giữ license, có Vietnamese/Latin unicode ranges. UI seed có nhãn; không dùng dữ liệu cá nhân thật.

## Lệnh đã chạy và kết quả

| Lệnh | Kết quả | Phạm vi chứng minh |
|---|---|---|
| `npm.cmd run build` | PASS | Prisma generate, compile, lint/type và 17 static pages; không thay UI review |
| `npm.cmd run format:check` | PASS | Source/scripts/tests/config được định dạng |
| `npm.cmd run lint` / `npm.cmd run typecheck` | PASS | Không tắt lint/type để che lỗi |
| `npm.cmd test` | 18/18 PASS | 7 unit + 11 integration PostgreSQL; 20 request tranh 5 chỗ, 8 request cùng phone, idempotency, nhóm/trẻ, deadline, FIFO/hold, hủy/capacity, audit bất biến, outbox/token/retry |
| `npm.cmd run test:e2e` | 11/11 PASS | Canonical/hreflang tuyệt đối VI/EN, public tìm/lọc/VI–EN, menu/Esc/focus, Guest 401, admin/nháp/404/XLSX, đăng ký mobile/lookup/ICS/hủy, liên hệ/inbox/MIME giả, newsletter qua worker, từ chối analytics; 2 visual showcase |
| `npx.cmd playwright test tests/e2e/demo.spec.ts --grep FR-WS` | 1/1 PASS | Chạy lại luồng workshop trên build cuối sau sửa retry pool và giờ kiểm tra sau khóa |
| `node scripts/check-rules.mjs` | PASS | Palette/token, href rỗng, type suppression và localStorage |
| `npm.cmd audit --audit-level=moderate` | 0 vulnerabilities | Trạng thái dependency tại thời điểm chạy; không phải bảo đảm mọi vấn đề bảo mật |
| `npx.cmd prisma validate` | PASS | Schema hợp lệ; không thay kiểm thử restore/migration production |
| `node scripts/route-review.mjs` | 260 trạng thái PASS | 21 route public × 2 locale × 5 width + 10 admin × 5 width; HTTP, H1, overflow; axe ở 375/1440 |
| `node scripts/route-review.mjs --workshop-only` | 10 trạng thái PASS | Chạy lại workshop VI/EN × 5 width sau sửa metadata và policy lấy số giờ cấu hình; [report](workshop-final-review.json) |
| `node scripts/capture-preview.mjs` | PASS | Ảnh viewport public/admin 375/1440 để review trực tiếp |

Đã phát hiện và sửa: 404 trả 200 do streaming, aria-label trên swatch, tương phản placeholder nghệ nhân, overflow bảng admin mobile, font tiếng Việt/layout shift, hai CAPTCHA dùng chung script, lỗi alt EN rỗng và pool transaction bận. Giữ nguyên tải/timeout/assertion kiểm tra; retry chỉ áp dụng lỗi transaction chưa bắt đầu và deadlock/unique có giới hạn. Thời điểm deadline được đọc sau khi khóa buổi.

## Bằng chứng UI

- [Public desktop](home-viewport-1440.png), [public mobile](home-viewport-375.png), [admin desktop](admin-viewport-1440.png), [admin mobile](admin-viewport-375.png).
- [Home trước sửa 1440](home-before-1440.png), [sau sửa 1440](vi-home-1440.png); [trước sửa 375](home-before-375.png), [sau sửa 375](vi-home-375.png). “Trước” là baseline đầu đã dựng, không bịa ảnh repository trống.
- [Home EN](en-home-1440.png), [workshop VI mobile](vi-workshop-in-tranh-co-ban-375.png), [workshop EN mobile](en-workshop-in-tranh-co-ban-375.png), [CMS mobile](admin-tranh-moi-375.png).
- [Route report](route-review.json) ghi route/locale/viewport/status/H1/overflow/axe. Đã review trực tiếp hero mobile, desktop public và dashboard admin.
- Visual showcase cố định thời gian phía browser, chờ font, reduced motion, dữ liệu component tĩnh; diff nghiêm ngặt `maxDiffPixels: 0`. Chỉ tạo baseline lần đầu, chưa được chủ dự án duyệt. Ảnh route dùng dữ liệu DB/thời gian đang chạy, không dùng làm baseline regression cố định. Không mask khác biệt.

## Giới hạn và chốt chưa đạt

Lighthouse 13.5, Chromium local, profile mobile/4G mặc định, production build; không đổi throttling/tolerance:

| Route | Performance | Accessibility | SEO | LCP | CLS |
|---|---:|---:|---:|---:|---:|
| `/` | 75 | 100 | 69 | 4,316 s | 0,000008 |
| `/workshop/in-tranh-co-ban` | 80 | 100 | 54 (trước sửa metadataBase) | 3,588 s | 0 |

[Home report](lighthouse-home-final.report.html), [workshop report](lighthouse-workshop-final.report.html). NFR-01 **chưa đạt** Performance ≥90/LCP <2,5 s. Prototype chủ động noindex làm SEO không đạt ngưỡng nghiệm thu; không bật index để lấy điểm. Báo cáo workshop phát hiện canonical/hreflang tương đối; đã sửa metadataBase ở layout chung và thêm E2E kiểm URL tuyệt đối VI/EN. Lượt kiểm tra SEO sau sửa được lưu riêng, không xóa báo cáo cũ.

[Workshop SEO sau sửa](lighthouse-workshop-seo-final.report.html): **69**, canonical/hreflang đã đạt; còn `noindex` chủ động. Lượt này chỉ đo lại category SEO, không dùng để thay kết quả Performance/Accessibility của lượt đầy đủ. Giao diện chính sách hủy dùng số giờ từ SiteSetting thay vì cố định 24. Endpoint media bổ sung chặn file chưa CLEAN khi production và lọc tham chiếu nội dung demo; integration provider/scanner production vẫn chưa xác minh.

- Chưa có ảnh/video/tư liệu/nghệ nhân thật được xác nhận quyền dùng. Placeholder có nhãn chỉ được phép trong prototype; production loại fixture.
- Email được worker ghi `LOCAL_CAPTURED`; chưa gửi tới SMTP thật. R2, scanner, email provider, CAPTCHA production, bank và chính sách cơ sở chưa xác minh. Production fail closed với cấu hình demo/thiếu integration.
- Upload video 500MB/resume/frame/VTT, player SDK thống kê embed, CMS kéo thả/crop, JSON-LD đầy đủ, bộ lọc audit và coverage một số trạng thái/bảo mật còn IN_PROGRESS/TODO. Preview CMS có quyền/noindex đã triển khai.
- Axe tự động không thay review WCAG hoàn chỉnh. Chưa test tay zoom 200% đầy đủ, screen reader, hai phiên bản Chrome/Safari/Firefox/Edge và thiết bị iOS/Android thật. Browser kiểm tra là Chromium Playwright trên Windows.
- Chưa chứng minh backup 30 bản/restore, uptime, monitoring tập trung, quy trình deploy/rollback hoặc required checks remote. Workflow CI đã tạo nhưng chưa có remote để chạy/khóa merge. **BLOCKED cho nghiệm thu production**.
- [requirements-matrix.md](../requirements-matrix.md) giữ từng FR/BR/NFR/UI và phần còn thiếu; không đánh dấu tất cả PASS. Baseline tự đối chiếu SRS chương 8–9, chưa phải phê duyệt Figma/chủ dự án.
- Trace/credential/email local là riêng tư, không đưa vào bằng chứng công khai hay CI artifacts.
