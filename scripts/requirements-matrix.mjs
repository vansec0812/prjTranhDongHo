import fs from "node:fs";
const rules = fs.readFileSync("AGENTS.md", "utf8");
const source = fs.readFileSync("docs/srs/extracted.txt", "utf8");
const pages = new Map();
for (const section of source
  .split(/--- PAGE (\d+) ---/)
  .slice(1)
  .reduce((a, v, i, all) => (i % 2 === 0 ? [...a, [v, all[i + 1]]] : a), [])) {
  for (const id of section[1].matchAll(/\b(?:FR-[A-Z]+|BR|NFR)-\d{2}\b/g))
    if (!pages.has(id[0])) pages.set(id[0], section[0]);
}
const details = {
  "FR-HOME-01": [
    "IN_PROGRESS",
    "Header/menu/VI–EN đã dựng; E2E menu và switch; chưa chốt toàn bộ CTA/header mockup.",
  ],
  "FR-HOME-02": [
    "IN_PROGRESS",
    "CMS text/CTA, hero ≤3 và chọn ba tranh published từ cấu hình; thiếu nội dung/asset thật và phê duyệt baseline.",
  ],
  "FR-HOME-03": [
    "IN_PROGRESS",
    "Editor cấu hình 3–4 số liệu (hoặc không hiện khi chưa có), lưu SiteSetting; cần cơ sở xác nhận số liệu thật.",
  ],
  "FR-HOME-04": [
    "IN_PROGRESS",
    "Server counts new/confirmed/hold; cần acceptance E2E trạng thái và đồng bộ admin.",
  ],
  "FR-HOME-05": [
    "BLOCKED",
    "Bố cục + truy vấn 4 video; nguồn video/thumbnail/thời lượng thật chưa được cung cấp.",
  ],
  "FR-HOME-06": [
    "BLOCKED",
    "6 mẫu tranh/3 bài; thiếu chân dung/câu nói đã xác minh.",
  ],
  "FR-HOME-07": [
    "IN_PROGRESS",
    "Footer/bản tin/chính sách/map link từ cấu hình; thông tin cơ sở thật chưa xác nhận.",
  ],
  "FR-HIS-01": [
    "BLOCKED",
    "Rich text CMS; ảnh xưởng và tư liệu cơ sở chưa cung cấp.",
  ],
  "FR-HIS-02": [
    "IN_PROGRESS",
    "Timeline ngang/dọc và sửa sortOrder; kéo thả CMS chưa làm.",
  ],
  "FR-HIS-03": [
    "IN_PROGRESS",
    "Năm bước đúng thứ tự SRS; ảnh/clip thực tế chưa có.",
  ],
  "FR-HIS-04": ["BLOCKED", "Không tạo chứng cứ nguồn màu; chờ tư liệu cơ sở."],
  "FR-HIS-05": [
    "IN_PROGRESS",
    "5 danh mục có liên kết lọc; nội dung thật chưa duyệt.",
  ],
  "FR-VID-03": [
    "IN_PROGRESS",
    "YouTube/Vimeo allowlist/active check; MP4 500MB và VTT chưa hoàn tất.",
  ],
  "FR-VID-04": [
    "IN_PROGRESS",
    "HTML5 playback 10s + dedupe 30m; player SDK YouTube/Vimeo chưa tích hợp.",
  ],
  "FR-WS-04": [
    "PASS",
    "tests/integration/workshop.test.ts: 20 request tranh 5 chỗ, nhóm, idempotency; PostgreSQL thật.",
  ],
  "BR-01": [
    "PASS",
    "Integration 20 request/5 chỗ và child/hold; không giảm tải kiểm thử.",
  ],
  "BR-02": [
    "PASS",
    "Integration 8 request cùng SĐT, chỉ 2 hiệu lực; normalized lookup.",
  ],
  "BR-03": [
    "PASS",
    "Integration biên deadline và worker không cần chạy để từ chối.",
  ],
  "BR-04": [
    "IN_PROGRESS",
    "Backend hủy theo cấu hình; thiếu test tất cả biên X giờ + E2E cuối.",
  ],
  "BR-05": [
    "IN_PROGRESS",
    "UI cảnh báo, không thu ngày sinh; chưa kiểm tra toàn bộ trạng thái accessibility.",
  ],
  "FR-WS-05": [
    "IN_PROGRESS",
    "Mã/ICS/outbox thật; mail local riêng, chưa SMTP/đường đi thật.",
  ],
  "FR-WS-07": [
    "IN_PROGRESS",
    "Worker confirmed 24h idempotent; chưa xác minh email SMTP đúng thời điểm.",
  ],
  "FR-ART-01": [
    "BLOCKED",
    "Hồ sơ mẫu có nhãn, không gán danh hiệu/nhân vật; chờ dữ liệu thật.",
  ],
  "FR-ART-04": [
    "IN_PROGRESS",
    "Link từ config; chưa có số/URL liên hệ thật, cần kiểm tra vị trí mobile.",
  ],
  "FR-GEN-05": [
    "BLOCKED",
    "Google map cấp làng; chưa xác nhận địa chỉ cơ sở/giờ/vé/đường đi.",
  ],
  "FR-GEN-07": [
    "IN_PROGRESS",
    "Token hash/confirm một lần/consent/exclude unconfirmed; integration đã chạy, SMTP chưa.",
  ],
  "FR-GEN-10": [
    "IN_PROGRESS",
    "Banner chấp nhận/từ chối, lưu preference riêng; video-view từ chối khi chưa consent. E2E kiểm cookie, cần review tracking của embed thật.",
  ],
  "FR-ADM-03": [
    "IN_PROGRESS",
    "Editor + nguồn embed/thumbnail upload/schedule; resumable MP4 500MB/frame/VTT còn thiếu.",
  ],
  "FR-ADM-07": [
    "IN_PROGRESS",
    "Create/update/hide/delete có xác nhận và FK chặn nội dung đang dùng; preview riêng có quyền/noindex, song ngữ/rich text; drag-drop còn thiếu.",
  ],
  "FR-ADM-08": [
    "IN_PROGRESS",
    "Upload ảnh progress/decode/WebP/variants/alt/nơi dùng; crop/resume/drag-drop chưa đủ.",
  ],
  "FR-ADM-09": [
    "IN_PROGRESS",
    "SiteSetting editor liên hệ/giờ/bank/hủy/hero/stats; SEO/email template editor chưa đủ.",
  ],
  "FR-ADM-11": [
    "IN_PROGRESS",
    "Audit append-only DB trigger đã test; UI lọc người/ngày chưa đủ.",
  ],
  "NFR-01": [
    "IN_PROGRESS",
    "Production Lighthouse mobile/4G: home 75/100/69, workshop 80/100/54 trước sửa canonical; SEO sau sửa 69. LCP 4,316/3,588s. Chưa đạt Performance/LCP/SEO; xem reports và review, không đổi profile để báo pass.",
  ],
  "NFR-02": [
    "IN_PROGRESS",
    "Chromium giả lập 5 widths; chưa Safari/Firefox/Edge/thiết bị thật.",
  ],
  "NFR-06": [
    "IN_PROGRESS",
    "SSR metadata/canonical/hreflang/sitemap/noindex; JSON-LD đầy đủ còn thiếu.",
  ],
  "NFR-07": [
    "BLOCKED",
    "Chưa quan sát uptime, backup 30 bản/restore/media versioning chưa kiểm chứng.",
  ],
  "NFR-08": [
    "BLOCKED",
    "Chưa có video thật và upload hoàn chỉnh để đo thời gian thao tác ≤3 phút.",
  ],
  "NFR-09": [
    "IN_PROGRESS",
    "Readiness + outbox/heartbeat; correlation/log/cảnh báo tập trung chưa hoàn tất.",
  ],
  "UI-11": [
    "BLOCKED",
    "Minh họa dev có nhãn; thiếu ảnh thật có quyền dùng trước production.",
  ],
  "UI-26": [
    "IN_PROGRESS",
    "Baseline tự đối chiếu SRS trang15–24; chưa được chủ dự án phê duyệt.",
  ],
  "UI-27": [
    "IN_PROGRESS",
    "Kiểm tra năm widths 360/375/768/1200/1440, public VI/EN/admin; kết quả cụ thể và các giới hạn ở docs/qa/review.md.",
  ],
  "UI-28": [
    "IN_PROGRESS",
    "Ảnh trước/sau trong docs/qa; chưa có Git commit, manifest SHA dùng nhận diện local.",
  ],
  "UI-30": [
    "IN_PROGRESS",
    "Token/a11y/visual cần CI; remote CI chưa có bằng chứng chạy.",
  ],
  "ENG-11": [
    "TODO",
    "Multipart/resume MP4 500MB/metadata/frame chưa triển khai; không dùng upload ảnh để báo đạt.",
  ],
  "ENG-13": [
    "IN_PROGRESS",
    "Worker publish bền vững; preview qua /admin/preview/[id] kiểm quyền server/noindex. Preview token chia sẻ chưa có.",
  ],
  "ENG-17": [
    "IN_PROGRESS",
    "Reminders/ICS cơ bản; sequence cập nhật và email provider chưa bao phủ.",
  ],
  "SEC-07": [
    "IN_PROGRESS",
    "Worker anonymize DB/outbox; local capture/exports cũ/backups chưa có lifecycle đủ.",
  ],
  "SEC-08": [
    "BLOCKED",
    "Chính sách/bản quyền/tư vấn pháp lý và đối chiếu VN chưa xác nhận.",
  ],
  "QA-05": [
    "IN_PROGRESS",
    "E2E thật đang chạy; chưa đủ mọi kịch bản trong hợp đồng.",
  ],
  "QA-06": [
    "BLOCKED",
    "SMTP/R2 credentials thật chưa có; local capture không tính production pass.",
  ],
  "QA-07": [
    "IN_PROGRESS",
    "Checks local và workflow; chưa có remote/required checks/branch protection.",
  ],
  "OPS-03": [
    "IN_PROGRESS",
    "Runbook lệnh setup/build/test/worker thật; backup/restore/rollback chưa có script đã test.",
  ],
  "OPS-04": ["BLOCKED", "Chưa deploy, không tự public/phát sinh chi phí."],
};
function module(id) {
  if (id.startsWith("FR-HOME")) return "/ · src/app/[locale]/page.tsx";
  if (id.startsWith("FR-HIS")) return "/lich-su · components/history.tsx";
  if (id.startsWith("FR-GAL")) return "/thu-vien-tranh · catchall public";
  if (id.startsWith("FR-VID")) return "/video · video-player.tsx";
  if (id.startsWith("FR-WS") || id.startsWith("BR"))
    return "/workshop · services/registration.ts";
  if (id.startsWith("FR-ART")) return "/nghe-nhan, /lien-he · contact service";
  if (id.startsWith("FR-ADM")) return "/admin · admin API/CMS/auth";
  if (id.startsWith("FR-GEN")) return "public catchall · newsletter/content";
  if (id.startsWith("UI"))
    return "tokens.css, globals.css, components, docs/qa";
  return "lib/services/API/config · tests/docs";
}
const ids = [
  ...new Set(
    [
      ...rules.matchAll(
        /\b(?:FR-[A-Z]+|BR|NFR|UI|ENG|SEC|OPS|QA|GOV)-\d{2}\b/g,
      ),
    ].map((m) => m[0]),
  ),
];
let md =
  "# Ma trận yêu cầu — trạng thái prototype\n\nNguồn SRS 29 trang tại root, AGENTS.md v1.0 (đã đọc toàn bộ), plan và prompt. Không thay đổi hợp đồng. PASS chỉ áp dụng nội dung đã có kiểm thử/bằng chứng nêu trong hàng; IN_PROGRESS không phải nghiệm thu. Source page tự đối chiếu văn bản PDF, UI/ENG/SEC/OPS/QA/GOV là quy tắc bổ sung AGENTS, không gán mã SRS.\n\n| Mã | Nguồn/trang | Module/route | Trạng thái | Bằng chứng / phần còn thiếu |\n|---|---|---|---|---|\n";
for (const id of ids) {
  const d = details[id] ?? [
    "IN_PROGRESS",
    "Đã có triển khai cơ bản liên quan; chưa đủ coverage/bằng chứng nghiệm thu toàn điều khoản. Xem code và docs/qa; không coi build pass là acceptance.",
  ];
  const page = pages.get(id);
  md += `| ${id} | ${page ? "SRS p." + page : "AGENTS " + id.split("-")[0]} | ${module(id)} | ${d[0]} | ${d[1]} |\n`;
}
md +=
  "\nCác blocker không bị bỏ khỏi phạm vi: dữ liệu/bản quyền/chính sách, integration production, video upload lớn/resume/VTT, CMS đầy đủ, CI/bảo mật/cross-browser/visual, SEO schema và vận hành. Không bàn giao như production khi còn IN_PROGRESS/TODO/BLOCKED.\n";
fs.writeFileSync("docs/requirements-matrix.md", md);
