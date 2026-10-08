# Ma trận yêu cầu — trạng thái prototype

Nguồn SRS 29 trang tại root, AGENTS.md v1.0 (đã đọc toàn bộ), plan và prompt. Không thay đổi hợp đồng. PASS chỉ áp dụng nội dung đã có kiểm thử/bằng chứng nêu trong hàng; IN_PROGRESS không phải nghiệm thu. Source page tự đối chiếu văn bản PDF, UI/ENG/SEC/OPS/QA/GOV là quy tắc bổ sung AGENTS, không gán mã SRS.

Cập nhật DB/Vercel 04/10/2026: ENG-01, ENG-23, OPS-01/02/03 và QA-07 được truy vết riêng tại [QA DB/Vercel](qa/vercel-database-2026-10-04.md), [hướng dẫn deploy](vercel.md), `src/lib/database-config.ts`, `prisma.config.ts` và test DB config/integration. Các trạng thái toàn điều khoản bên dưới giữ nguyên vì chưa có DB cloud/deploy/backup/worker production đã kiểm chứng.

Cập nhật prototype dashboard/email thật cùng ngày: xem [hướng dẫn](vercel-prototype.md) và [QA phạm vi thay đổi](qa/vercel-prototype/review.md). ENG-23: bootstrap/import/admin có marker, advisory lock, test PostgreSQL tạo admin đồng thời và giữ mật khẩu. SEC-02: Node 24 Argon2id đọc PHC cũ, test password và E2E login. ENG-15/16, FR-ART-03/FR-WS-05/FR-GEN-07: private Blob và Resend sau commit, bounded outbox, chưa xác minh provider cloud. OPS-01/02/03: opt-in profile, migrate trong build, cron Bearer daily và runbook; lịch phút/production scanner/backup vẫn BLOCKED. UI-27/28: before/after 5 viewport, public VI/EN/admin. QA-07: giữ audit gate, advisory braces chưa vá nên nhánh review chưa được merge/release. Không đổi trạng thái nghiệm thu toàn hệ thống từ những kiểm tra phạm vi này.

Cập nhật CI/Vercel 07/10/2026: OPS-02/03/04, NFR-09 và QA-07 có [bằng chứng kiểm tra](qa/vercel-ci-2026-10-07.md). Local setup PASS sau sửa kết nối PostgreSQL IPv4; CI Windows cần chạy lại với log lỗi đã redaction. Audit và kiểm tra cloud vẫn BLOCKED; chưa merge/release hoặc đổi trạng thái nghiệm thu toàn hệ thống.

Cập nhật bootstrap admin 08/10/2026: FR-ADM-01 (SRS p.10), ENG-23 và OPS-02/03 có [bằng chứng sửa lỗi](qa/vercel-admin-bootstrap-2026-10-08.md). Commit `38a745e` đã ở `main`, cả hai job CI PASS với ngoại lệ audit demo được chủ dự án cho phép. Log Vercel mới đã migrate/import nhưng thiếu hoặc sai thông tin admin đầu tiên. Bản sửa phân biệt biến sai, chuẩn hóa email và kiểm tra trước seed/import; test DB đồng thời/idempotency vẫn PASS. Cloud readiness và đăng nhập tài khoản mới còn BLOCKED tới khi sửa hai biến Production và deploy thành công; không nâng trạng thái nghiệm thu toàn FR-ADM-01.

| Mã | Nguồn/trang | Module/route | Trạng thái | Bằng chứng / phần còn thiếu |
|---|---|---|---|---|
| GOV-01 | AGENTS GOV | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| GOV-02 | AGENTS GOV | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| GOV-03 | AGENTS GOV | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| GOV-04 | AGENTS GOV | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| GOV-05 | AGENTS GOV | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| GOV-06 | AGENTS GOV | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| GOV-07 | AGENTS GOV | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| GOV-08 | AGENTS GOV | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| GOV-09 | AGENTS GOV | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-01 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-WS-03 | SRS p.2 | /workshop · services/registration.ts | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-01 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-02 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-03 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-04 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-05 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-06 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-07 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-08 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-09 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-10 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-11 | AGENTS UI | tokens.css, globals.css, components, docs/qa | BLOCKED | Minh họa dev có nhãn; thiếu ảnh thật có quyền dùng trước production. |
| UI-12 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-13 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-14 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-15 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-16 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-17 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-18 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-19 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-20 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-21 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-22 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-23 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-24 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-25 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-26 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Baseline tự đối chiếu SRS trang15–24; chưa được chủ dự án phê duyệt. |
| UI-27 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Kiểm tra năm widths 360/375/768/1200/1440, public VI/EN/admin; kết quả cụ thể và các giới hạn ở docs/qa/review.md. |
| UI-28 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Ảnh trước/sau trong docs/qa; chưa có Git commit, manifest SHA dùng nhận diện local. |
| UI-29 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| UI-30 | AGENTS UI | tokens.css, globals.css, components, docs/qa | IN_PROGRESS | Token/a11y/visual cần CI; remote CI chưa có bằng chứng chạy. |
| FR-HOME-01 | SRS p.7 | / · src/app/[locale]/page.tsx | IN_PROGRESS | Header/menu/VI–EN đã dựng; E2E menu và switch; chưa chốt toàn bộ CTA/header mockup. |
| FR-HOME-02 | SRS p.7 | / · src/app/[locale]/page.tsx | IN_PROGRESS | CMS text/CTA, hero ≤3 và chọn ba tranh published từ cấu hình; thiếu nội dung/asset thật và phê duyệt baseline. |
| FR-HOME-03 | SRS p.7 | / · src/app/[locale]/page.tsx | IN_PROGRESS | Editor cấu hình 3–4 số liệu (hoặc không hiện khi chưa có), lưu SiteSetting; cần cơ sở xác nhận số liệu thật. |
| FR-HOME-04 | SRS p.7 | / · src/app/[locale]/page.tsx | IN_PROGRESS | Server counts new/confirmed/hold; cần acceptance E2E trạng thái và đồng bộ admin. |
| FR-HOME-05 | SRS p.7 | / · src/app/[locale]/page.tsx | BLOCKED | Bố cục + truy vấn 4 video; nguồn video/thumbnail/thời lượng thật chưa được cung cấp. |
| FR-HOME-06 | SRS p.7 | / · src/app/[locale]/page.tsx | BLOCKED | 6 mẫu tranh/3 bài; thiếu chân dung/câu nói đã xác minh. |
| FR-HOME-07 | SRS p.7 | / · src/app/[locale]/page.tsx | IN_PROGRESS | Footer/bản tin/chính sách/map link từ cấu hình; thông tin cơ sở thật chưa xác nhận. |
| FR-HIS-01 | SRS p.7 | /lich-su · components/history.tsx | BLOCKED | Rich text CMS; ảnh xưởng và tư liệu cơ sở chưa cung cấp. |
| FR-HIS-02 | SRS p.7 | /lich-su · components/history.tsx | IN_PROGRESS | Timeline ngang/dọc và sửa sortOrder; kéo thả CMS chưa làm. |
| FR-HIS-03 | SRS p.7 | /lich-su · components/history.tsx | IN_PROGRESS | Năm bước đúng thứ tự SRS; ảnh/clip thực tế chưa có. |
| FR-HIS-04 | SRS p.7 | /lich-su · components/history.tsx | BLOCKED | Không tạo chứng cứ nguồn màu; chờ tư liệu cơ sở. |
| FR-HIS-05 | SRS p.7 | /lich-su · components/history.tsx | IN_PROGRESS | 5 danh mục có liên kết lọc; nội dung thật chưa duyệt. |
| FR-GAL-01 | SRS p.7 | /thu-vien-tranh · catchall public | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-GAL-02 | SRS p.8 | /thu-vien-tranh · catchall public | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-GAL-03 | SRS p.8 | /thu-vien-tranh · catchall public | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-VID-01 | SRS p.8 | /video · video-player.tsx | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-VID-02 | SRS p.8 | /video · video-player.tsx | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-VID-03 | SRS p.8 | /video · video-player.tsx | IN_PROGRESS | YouTube/Vimeo allowlist/active check; MP4 500MB và VTT chưa hoàn tất. |
| FR-VID-04 | SRS p.8 | /video · video-player.tsx | IN_PROGRESS | HTML5 playback 10s + dedupe 30m; player SDK YouTube/Vimeo chưa tích hợp. |
| FR-WS-01 | SRS p.8 | /workshop · services/registration.ts | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-WS-02 | SRS p.8 | /workshop · services/registration.ts | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-WS-04 | SRS p.8 | /workshop · services/registration.ts | PASS | tests/integration/workshop.test.ts: 20 request tranh 5 chỗ, nhóm, idempotency; PostgreSQL thật. |
| FR-WS-05 | SRS p.8 | /workshop · services/registration.ts | IN_PROGRESS | Mã/ICS/outbox thật; mail local riêng, chưa SMTP/đường đi thật. |
| FR-WS-06 | SRS p.8 | /workshop · services/registration.ts | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-WS-07 | SRS p.8 | /workshop · services/registration.ts | IN_PROGRESS | Worker confirmed 24h idempotent; chưa xác minh email SMTP đúng thời điểm. |
| FR-WS-08 | SRS p.8 | /workshop · services/registration.ts | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-ART-01 | SRS p.9 | /nghe-nhan, /lien-he · contact service | BLOCKED | Hồ sơ mẫu có nhãn, không gán danh hiệu/nhân vật; chờ dữ liệu thật. |
| FR-ART-02 | SRS p.9 | /nghe-nhan, /lien-he · contact service | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-ART-03 | SRS p.9 | /nghe-nhan, /lien-he · contact service | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-ART-04 | SRS p.9 | /nghe-nhan, /lien-he · contact service | IN_PROGRESS | Link từ config; chưa có số/URL liên hệ thật, cần kiểm tra vị trí mobile. |
| FR-GEN-01 | SRS p.9 | public catchall · newsletter/content | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-GEN-02 | SRS p.9 | public catchall · newsletter/content | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-GEN-03 | SRS p.9 | public catchall · newsletter/content | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-GEN-04 | SRS p.9 | public catchall · newsletter/content | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-GEN-05 | SRS p.9 | public catchall · newsletter/content | BLOCKED | Google map cấp làng; chưa xác nhận địa chỉ cơ sở/giờ/vé/đường đi. |
| FR-GEN-06 | SRS p.9 | public catchall · newsletter/content | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-GEN-07 | SRS p.9 | public catchall · newsletter/content | IN_PROGRESS | Token hash/confirm một lần/consent/exclude unconfirmed; integration đã chạy, SMTP chưa. |
| FR-GEN-08 | SRS p.9 | public catchall · newsletter/content | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-GEN-09 | SRS p.9 | public catchall · newsletter/content | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-GEN-10 | SRS p.9 | public catchall · newsletter/content | IN_PROGRESS | Banner chấp nhận/từ chối, lưu preference riêng; video-view từ chối khi chưa consent. E2E kiểm cookie, cần review tracking của embed thật. |
| BR-01 | SRS p.11 | /workshop · services/registration.ts | PASS | Integration 20 request/5 chỗ và child/hold; không giảm tải kiểm thử. |
| BR-02 | SRS p.11 | /workshop · services/registration.ts | PASS | Integration 8 request cùng SĐT, chỉ 2 hiệu lực; normalized lookup. |
| BR-03 | SRS p.11 | /workshop · services/registration.ts | PASS | Integration biên deadline và worker không cần chạy để từ chối. |
| BR-04 | SRS p.11 | /workshop · services/registration.ts | IN_PROGRESS | Backend hủy theo cấu hình; thiếu test tất cả biên X giờ + E2E cuối. |
| BR-05 | SRS p.11 | /workshop · services/registration.ts | IN_PROGRESS | UI cảnh báo, không thu ngày sinh; chưa kiểm tra toàn bộ trạng thái accessibility. |
| ENG-02 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-03 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-04 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-05 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-06 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-07 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-08 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-09 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-10 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-ADM-01 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-ADM-02 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-ADM-03 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Editor + nguồn embed/thumbnail upload/schedule; resumable MP4 500MB/frame/VTT còn thiếu. |
| FR-ADM-04 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-ADM-05 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-ADM-06 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-ADM-07 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Create/update/hide/delete có xác nhận và FK chặn nội dung đang dùng; preview riêng có quyền/noindex, song ngữ/rich text; drag-drop còn thiếu. |
| FR-ADM-08 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Upload ảnh progress/decode/WebP/variants/alt/nơi dùng; crop/resume/drag-drop chưa đủ. |
| FR-ADM-09 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | SiteSetting editor liên hệ/giờ/bank/hủy/hero/stats; SEO/email template editor chưa đủ. |
| FR-ADM-10 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| FR-ADM-11 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Audit append-only DB trigger đã test; UI lọc người/ngày chưa đủ. |
| FR-ADM-12 | SRS p.10 | /admin · admin API/CMS/auth | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-11 | AGENTS ENG | lib/services/API/config · tests/docs | TODO | Multipart/resume MP4 500MB/metadata/frame chưa triển khai; không dùng upload ảnh để báo đạt. |
| ENG-12 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-13 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Worker publish bền vững; preview qua /admin/preview/[id] kiểm quyền server/noindex. Preview token chia sẻ chưa có. |
| ENG-14 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-15 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-16 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-17 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Reminders/ICS cơ bản; sequence cập nhật và email provider chưa bao phủ. |
| ENG-18 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-19 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-20 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-21 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-22 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-23 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-24 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-25 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-26 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-27 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| ENG-28 | AGENTS ENG | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| SEC-01 | AGENTS SEC | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| SEC-02 | AGENTS SEC | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| SEC-03 | AGENTS SEC | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| SEC-04 | AGENTS SEC | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| SEC-05 | AGENTS SEC | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| SEC-06 | AGENTS SEC | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| SEC-07 | AGENTS SEC | lib/services/API/config · tests/docs | IN_PROGRESS | Worker anonymize DB/outbox; local capture/exports cũ/backups chưa có lifecycle đủ. |
| SEC-08 | AGENTS SEC | lib/services/API/config · tests/docs | BLOCKED | Chính sách/bản quyền/tư vấn pháp lý và đối chiếu VN chưa xác nhận. |
| NFR-01 | SRS p.14 | lib/services/API/config · tests/docs | IN_PROGRESS | Đo lại production build local mobile/4G: home 80/100/69, workshop 69/100/58; LCP 4,42/4,84s, CLS 0. Chưa đạt Performance/LCP/SEO; noindex local giữ nguyên. Báo cáo tại docs/qa/source-update, không đổi profile để báo pass. |
| NFR-02 | SRS p.14 | lib/services/API/config · tests/docs | IN_PROGRESS | Chromium giả lập 5 widths; chưa Safari/Firefox/Edge/thiết bị thật. |
| NFR-03 | SRS p.14 | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| NFR-04 | SRS p.14 | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| NFR-05 | SRS p.14 | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| NFR-06 | SRS p.14 | lib/services/API/config · tests/docs | IN_PROGRESS | SSR metadata/canonical/hreflang/sitemap/noindex; JSON-LD đầy đủ còn thiếu. |
| NFR-07 | SRS p.14 | lib/services/API/config · tests/docs | BLOCKED | Chưa quan sát uptime, backup 30 bản/restore/media versioning chưa kiểm chứng. |
| NFR-08 | SRS p.14 | lib/services/API/config · tests/docs | BLOCKED | Chưa có video thật và upload hoàn chỉnh để đo thời gian thao tác ≤3 phút. |
| NFR-09 | SRS p.14 | lib/services/API/config · tests/docs | IN_PROGRESS | Readiness + outbox/heartbeat; correlation/log/cảnh báo tập trung chưa hoàn tất. |
| OPS-01 | AGENTS OPS | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| OPS-02 | AGENTS OPS | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| OPS-03 | AGENTS OPS | lib/services/API/config · tests/docs | IN_PROGRESS | Runbook lệnh setup/build/test/worker thật; backup/restore/rollback chưa có script đã test. |
| OPS-04 | AGENTS OPS | lib/services/API/config · tests/docs | BLOCKED | Chưa deploy, không tự public/phát sinh chi phí. |
| QA-01 | AGENTS QA | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| QA-02 | AGENTS QA | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| QA-03 | AGENTS QA | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| QA-04 | AGENTS QA | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |
| QA-05 | AGENTS QA | lib/services/API/config · tests/docs | IN_PROGRESS | E2E thật đang chạy; chưa đủ mọi kịch bản trong hợp đồng. |
| QA-06 | AGENTS QA | lib/services/API/config · tests/docs | BLOCKED | SMTP/R2 credentials thật chưa có; local capture không tính production pass. |
| QA-07 | AGENTS QA | lib/services/API/config · tests/docs | IN_PROGRESS | Checks local và workflow; chưa có remote/required checks/branch protection. |
| QA-08 | AGENTS QA | lib/services/API/config · tests/docs | IN_PROGRESS | Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance. |

Các blocker không bị bỏ khỏi phạm vi: dữ liệu/bản quyền/chính sách, integration production, video upload lớn/resume/VTT, CMS đầy đủ, CI/bảo mật/cross-browser/visual, SEO schema và vận hành. Không bàn giao như production khi còn IN_PROGRESS/TODO/BLOCKED.

## Cập nhật sourceImage/sourceVR · 03/10/2026

Phạm vi trực tiếp từ yêu cầu chủ dự án: thay ảnh nguồn, bỏ ghi chú SRS trên public, tóm tắt hover/focus/mobile và nội dung chi tiết. Không thay stack, trạng thái đăng ký, luật sức chứa hoặc tích hợp local. Nguồn VR: `SRS bổ sung - Tham quan thực tế ảo làng tranh Đông Hồ.pdf`, 19 trang. PASS dưới đây chỉ xác nhận phần được mô tả, không thay trạng thái nghiệm thu toàn hệ thống ở bảng trên.

| Mã / nguồn | Module / route | Trạng thái | Bằng chứng / giới hạn |
|---|---|---|---|
| FR-GAL-01/02/03, FR-GEN-04; SRS chính p.5–9 | CMS, ContentCard, Lightbox, `/thu-vien-tranh`, `/san-pham/[slug]` | IN_PROGRESS | Chín ảnh gốc, mô tả VI/EN, lọc không dấu, hover/focus/touch, chi tiết/zoom/liên hệ đúng tranh: E2E source-tour. Không tự điền chữ Hán, số đo, giá hoặc tồn hàng chưa được cơ sở cung cấp. |
| UI-11/12/18; AGENTS | assets pipeline, import CMS, MediaView, hero | IN_PROGRESS | Ảnh thật, contain, dimensions/sizes, không ghi chú SRS/prototype public; manifest nguồn SHA-256. Quyền phát hành cần xác nhận. |
| UI-19/20/22/27/28; AGENTS | public VI/EN/admin, tour, dialog | IN_PROGRESS | Keyboard/Esc/focus, axe, 5 viewport và ảnh 375/1440 tại `docs/qa/source-update`; Chromium giả lập, chưa đủ WCAG review và thiết bị thật. |
| FR-VR-01; PDF p.4 | `/tham-quan-360`, `/en/virtual-tour`, header/footer/home | IN_PROGRESS | Route/menu/preview hoạt động; source chỉ bốn ảnh quét ngang một phòng, chưa chín điểm cầu 2:1 như PDF p.2/9. |
| FR-VR-02; PDF p.4 | tour-viewer, autorotate | IN_PROGRESS | Kéo, keyboard, tự xoay dừng khi tương tác, reduced-motion; vuốt/quán tính chưa kiểm trên thiết bị thật. |
| FR-VR-03; PDF p.4 | tour-viewer, VisibleRange | IN_PROGRESS | Zoom +/−/wheel/pinch engine; FOV tối đa bị giới hạn theo ảnh quét ngang, chưa đạt khoảng 30–100° của ảnh cầu đầy đủ. |
| FR-VR-04; PDF p.5 | tour.json, markers, chuyển cảnh | IN_PROGRESS | Link đi/về, scene initial view, fade 400ms và back test thật; hướng đi vật lý cần khảo sát, không nhận là đúng bản đồ làng. |
| FR-VR-05; PDF p.5 | scene drawer, thumbnails | IN_PROGRESS | Nhảy trực tiếp và đánh dấu điểm hiện tại: E2E; hiện bốn thay vì chín điểm do nguồn. |
| FR-VR-06; PDF p.5 | tour-map | IN_PROGRESS | Sơ đồ lộ trình bốn nút chọn điểm; chưa có bản đồ làng được khảo sát. |
| FR-VR-07; PDF p.5 | audio opt-in, tour.json | BLOCKED | Chưa có MP3 45–90 giây VI/EN; nút có lý do disabled. Logic chuyển bài không được coi là âm thanh đã nghiệm thu. |
| FR-VR-08; PDF p.5 | ambient audio opt-in/ducking | BLOCKED | Không có file âm thanh nền; chưa kiểm nghe/ducking với file thật. |
| FR-VR-09; PDF p.5 | links, VI/EN tour content | IN_PROGRESS | Chữ VI/EN, đổi ngôn ngữ giữ `diem` E2E PASS; thuyết minh hai ngôn ngữ chưa có. |
| FR-VR-10; PDF p.5 | info markers/dialog, painting links | PASS | E2E mở con dấu bằng Enter, ảnh/tóm tắt đúng tranh, liên kết thư viện, Esc trả focus. Không gán hiện vật hoặc danh hiệu giả. |
| FR-VR-11; PDF p.5 | server publicSessions, tour CTA/contact | IN_PROGRESS | Nút workshop dùng lịch mở thật; popup tranh có liên hệ điền sẵn. Chưa có khu workshop riêng trong ảnh nguồn. |
| FR-VR-12; PDF p.6 | fullscreen API | PASS | E2E vào/thoát fullscreen thật; Esc do trình duyệt quản lý. iOS vẫn cần thiết bị thật. |
| FR-VR-13; PDF p.6 | progressive preview, neighbor prefetch, flat fallback | PASS | Canvas thật, preview trước ảnh nét; negative E2E không WebGL vẫn có ảnh/mô tả/đổi điểm. Tốc độ 4G xét riêng NFR-VR-01. |
| FR-VR-14; PDF p.6 | gyro plugin, permission | IN_PROGRESS | Bật theo thao tác, hỏi quyền iOS; chưa kiểm thiết bị có cảm biến. |
| FR-VR-15; PDF p.6 | query/deep link/popstate | PASS | E2E deep link, back, đổi VI/EN và mã điểm không tồn tại về điểm đầu an toàn. |
| BR-VR-01; PDF p.6 | audio state | IN_PROGRESS | Mặc định tắt, không audio autoplay; chưa có file để kiểm trường hợp phát sau click. |
| BR-VR-02; PDF p.6 | server publicSessions, CTA label | IN_PROGRESS | Không lấy lịch giả từ localStorage; chỉ `hasOpenSession` bật nhãn Giữ chỗ, còn lại Xem lịch. Chưa có E2E nhánh hết tất cả lịch. |
| NFR-VR-01; PDF p.8 | production network/performance | IN_PROGRESS | 1.600 kbps/150ms/CPU×4: preview 1,33s, nét 8,08s, chuyển đã tải trước 1,69s. Chưa đạt 5s/1s; xem `tour-network.json`, không thay profile. |
| NFR-VR-02; PDF p.8 | viewer/rendering | BLOCKED | Chưa đo ~60 FPS trên điện thoại tầm trung và desktop theo profile nghiệm thu. |
| NFR-VR-03; PDF p.8 | dynamic import chỉ trong tour | IN_PROGRESS | Homepage không import viewer; Lighthouse ≥90 cần report đo mới, không suy từ cấu trúc module. |
| NFR-VR-04; PDF p.8 | prepare-source-assets, assets.json | IN_PROGRESS | Mọi ảnh 8K/4K/preview/thumb đạt ngân sách, script fail nếu vượt. MP3 ≤1,5MB chưa kiểm do không có file. |
| NFR-VR-05; PDF p.8 | responsive/mobile 4K | IN_PROGRESS | 360/375/768/1200/1440 Chromium giả lập; Safari/Firefox/Edge hai phiên bản, iOS/Android thật chưa kiểm. |
| NFR-VR-06; PDF p.8 | keyboard/labels/text/reduced-motion | PASS | E2E hotspot Tab/Enter/Esc, nút có tên, mô tả từng điểm, axe và reduced-motion; phạm vi Chromium local. |
| NFR-VR-07; PDF p.8 | nguồn ảnh/bằng chứng consent | BLOCKED | Các hình người trong cảnh chính là mô hình trưng bày; ảnh bảng tư liệu vẫn có chân dung. Chưa có hồ sơ đồng ý/quyền ảnh để phát hành. |
| NFR-VR-08; PDF p.8 | user sourceImage/sourceVR | BLOCKED | User cung cấp nguồn, chưa có giấy phép/quyền phát hành của cơ sở. Chỉ chạy loopback, chưa demo công khai. |

PDF p.6 cho phép tour.json và công cụ `/dev/hotspot-picker` thay admin tour ở bản demo. Đã giữ giới hạn đó, không thêm CMS VR/3D/headset ngoài phạm vi. Lựa chọn bốn ảnh hiện có sau câu hỏi tùy chọn chưa được trả lời ghi tại `docs/decisions.md`; không tự nhận đủ chín điểm.
