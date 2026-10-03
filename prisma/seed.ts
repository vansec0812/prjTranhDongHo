import "dotenv/config";
import { ContentKind } from "@prisma/client";
import { db } from "../src/lib/db";
async function add(
  kind: ContentKind,
  slug: string,
  titleVi: string,
  titleEn: string,
  summaryVi: string,
  summaryEn: string,
  mediaKey?: string,
  categorySlug?: string,
  featured = false,
  sortOrder = 0,
) {
  const media = mediaKey
    ? await db.media.findUnique({ where: { key: mediaKey } })
    : null;
  const category = categorySlug
    ? await db.category.findUnique({
        where: { kind_slug: { kind, slug: categorySlug } },
      })
    : null;
  return db.content.upsert({
    where: { kind_slug: { kind, slug } },
    update: {},
    create: {
      kind,
      slug,
      titleVi,
      titleEn,
      summaryVi,
      summaryEn,
      bodyVi: `<p>${summaryVi}</p>`,
      bodyEn: `<p>${summaryEn}</p>`,
      status: "PUBLISHED",
      publishedAt: new Date("2026-09-28T00:00:00Z"),
      isDemo: true,
      featured,
      sortOrder,
      mediaId: media?.id,
      categoryId: category?.id,
    },
  });
}
async function main() {
  if (process.env.APP_MODE !== "prototype")
    throw new Error("Demo seed is forbidden outside prototype mode");
  for (const [name, vi, en] of [
    ["fish", "Cá – minh họa bố cục SRS", "Fish – SRS layout illustration"],
    ["pig", "Lợn – minh họa bố cục SRS", "Pig – SRS layout illustration"],
    ["flower", "Hoa – minh họa bố cục SRS", "Flower – SRS layout illustration"],
  ])
    await db.media.upsert({
      where: { key: `/demo/${name}.svg` },
      update: {},
      create: {
        key: `/demo/${name}.svg`,
        mime: "image/svg+xml",
        size: 0,
        width: 300,
        height: 400,
        altVi: vi,
        altEn: en,
        isDemo: true,
        scanStatus: "REFERENCE",
      },
    });
  const categories = [
    ["chuc-tung", "Chúc tụng", "Good wishes"],
    ["sinh-hoat", "Sinh hoạt", "Everyday life"],
    ["lich-su", "Lịch sử", "History"],
    ["truyen-tich", "Truyện tích", "Folk tales"],
    ["tho-cung", "Thờ cúng", "Worship"],
  ];
  for (const [slug, titleVi, titleEn] of categories) {
    const c = await db.category.upsert({
      where: { kind_slug: { kind: "PAINTING", slug } },
      create: { kind: "PAINTING", slug, titleVi, titleEn },
      update: {},
    });
    await db.paintingCategory.upsert({
      where: { categoryId: c.id },
      create: { categoryId: c.id },
      update: {},
    });
  }
  for (const [slug, titleVi, titleEn] of [
    ["quy-trinh", "Quy trình", "Process"],
    ["nghe-nhan", "Nghệ nhân kể chuyện", "Artisan stories"],
    ["workshop", "Workshop", "Workshops"],
    ["su-kien", "Sự kiện", "Events"],
    ["phong-su", "Phóng sự", "Documentary"],
  ]) {
    const c = await db.category.upsert({
      where: { kind_slug: { kind: "VIDEO", slug } },
      create: { kind: "VIDEO", slug, titleVi, titleEn },
      update: {},
    });
    await db.videoCategory.upsert({
      where: { categoryId: c.id },
      create: { categoryId: c.id },
      update: {},
    });
  }
  const art = [
    ["ca-minh-hoa", "Mẫu bố cục Cá", "Fish layout study", "fish", "chuc-tung"],
    ["lon-minh-hoa", "Mẫu bố cục Lợn", "Pig layout study", "pig", "chuc-tung"],
    [
      "hoa-minh-hoa",
      "Mẫu bố cục Hoa",
      "Flower layout study",
      "flower",
      "sinh-hoat",
    ],
    ["ca-mau-son", "Cá & màu son", "Fish & vermilion", "fish", "sinh-hoat"],
    ["lon-net-muc", "Lợn & nét mực", "Pig & ink lines", "pig", "truyen-tich"],
    ["hoa-sac-hoe", "Hoa & sắc hòe", "Flower & ochre", "flower", "tho-cung"],
  ];
  for (let i = 0; i < art.length; i++) {
    const [slug, vi, en, img, cat] = art[i];
    const c = await add(
      "PAINTING",
      slug,
      vi,
      en,
      "Minh họa bố cục phỏng theo mockup SRS, dùng kiểm tra khung tranh và bộ lọc. Chưa phải ảnh hiện vật, chưa có thông tin kích thước hay chữ trên tranh được kiểm chứng.",
      "A layout illustration based on the SRS mockup for testing frames and filters. Not an artefact photograph; dimensions and inscriptions have not been verified.",
      `/demo/${img}.svg`,
      cat,
      true,
      i,
    );
    await db.painting.upsert({
      where: { contentId: c.id },
      update: {},
      create: {
        contentId: c.id,
        color: i === 2 ? "ochre" : i === 1 ? "ink" : "vermilion",
        materialVi: "Chờ tư liệu cơ sở",
        materialEn: "Awaiting studio documentation",
      },
    });
  }
  const hero = await add(
    "HERO",
    "nam-mau",
    "Năm màu từ đất trời, in lên giấy điệp",
    "Five colours from nature, printed on dó paper",
    "Từ giấy dó, bột điệp đến những lớp màu. Xem câu chuyện làng tranh và chọn một buổi tự tay thử in.",
    "From dó paper and shell powder to layers of colour. Read the village story and choose a hands-on printing session.",
  );
  await db.heroSlide.upsert({
    where: { contentId: hero.id },
    update: {},
    create: { contentId: hero.id },
  });
  const workshops = [
    [
      "in-tranh-co-ban",
      "In tranh Đông Hồ cơ bản",
      "An introduction to Dong Ho printing",
      150000,
      100000,
      120,
    ],
    [
      "quet-diep-pha-mau",
      "Quét điệp & pha màu",
      "Shell coating & natural colours",
      250000,
      150000,
      150,
    ],
  ] as const;
  for (const [slug, vi, en, priceAdult, priceChild, durationMin] of workshops) {
    const c = await add(
      "WORKSHOP",
      slug,
      vi,
      en,
      "Lịch học minh họa: nghe giới thiệu về chất liệu, thử in các lớp màu và mang về hai bản in. Không thu phí trong bản demo.",
      "Sample class: learn about materials, try printing colour layers and take home two prints. No payment is collected in the demo.",
      "/demo/fish.svg",
    );
    const w = await db.workshop.upsert({
      where: { contentId: c.id },
      update: {},
      create: {
        contentId: c.id,
        priceAdult,
        priceChild,
        durationMin,
        minAge: 6,
        locationVi: "Xưởng mẫu – làng Đông Hồ, Bắc Ninh",
        locationEn: "Sample studio – Dong Ho village, Bac Ninh",
        includesVi: "Hai bản in và một túi giấy (nội dung demo)",
        includesEn: "Two prints and a paper bag (demo content)",
      },
    });
    const base = new Date();
    base.setUTCHours(2, 0, 0, 0);
    const distance = (6 - base.getUTCDay() + 7) % 7;
    base.setUTCDate(base.getUTCDate() + distance + (distance < 3 ? 7 : 0));
    for (let i = 0; i < 3; i++) {
      const startsAt = new Date(
        base.getTime() + (i === 0 ? 0 : i === 1 ? 1 : 7) * 86400000,
      );
      const id = `demo-${slug}-${i}`;
      await db.workshopSession.upsert({
        where: { id },
        update: {},
        create: {
          id,
          workshopId: w.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + durationMin * 60000),
          registerDeadline: new Date(startsAt.getTime() - 12 * 3600000),
          capacity: slug === "in-tranh-co-ban" ? 20 : 15,
          language: i === 1 ? "en" : "vi",
        },
      });
    }
  }
  for (const [slug, vi, en, cat, img] of [
    [
      "quet-diep",
      "Quét điệp lên giấy dó",
      "Coating dó paper",
      "quy-trinh",
      "fish",
    ],
    [
      "cho-tranh-tet",
      "Câu chuyện chợ tranh ngày Tết",
      "Stories from the Tet painting market",
      "nghe-nhan",
      "pig",
    ],
    [
      "nam-mau",
      "Năm màu tự nhiên",
      "Five natural colours",
      "quy-trinh",
      "flower",
    ],
    [
      "buoi-in-tranh",
      "Một buổi in tranh trong xưởng",
      "A printing session in the studio",
      "workshop",
      "fish",
    ],
  ]) {
    const c = await add(
      "VIDEO",
      slug,
      vi,
      en,
      "Thẻ video mẫu theo SRS. Chưa có video thực tế được cấp quyền sử dụng; admin có thể bổ sung nguồn và thumbnail.",
      "Sample video card from the SRS. No licensed video has been supplied; an admin can add a source and thumbnail.",
      `/demo/${img}.svg`,
      cat,
      slug === "cho-tranh-tet",
    );
    await db.video.upsert({
      where: { contentId: c.id },
      update: {},
      create: { contentId: c.id, tags: [] },
    });
  }
  const eras = [
    [
      "hinh-thanh",
      "Nghề in tranh hình thành",
      "The craft takes shape",
      "Khoảng thế kỷ XVI–XVII",
      "Around the 16th–17th centuries",
    ],
    [
      "cho-tranh",
      "Chợ tranh tháng Chạp",
      "The year-end painting market",
      "Thế kỷ XVIII–XIX",
      "18th–19th centuries",
    ],
    [
      "de-tai",
      "Mở rộng đề tài",
      "New themes",
      "Nửa đầu thế kỷ XX",
      "Early 20th century",
    ],
    [
      "tram-lang",
      "Giai đoạn trầm lắng",
      "A quieter period",
      "Cuối thế kỷ XX",
      "Late 20th century",
    ],
    [
      "bao-ton",
      "Bảo tồn & lan tỏa",
      "Preservation & sharing",
      "Hiện nay",
      "Today",
    ],
  ];
  for (let i = 0; i < eras.length; i++) {
    const [slug, vi, en, eraVi, eraEn] = eras[i];
    const c = await add(
      "MILESTONE",
      slug,
      vi,
      en,
      "Mốc minh họa từ SRS trang 19. Cần đối chiếu tư liệu của cơ sở trước khi xuất bản chính thức.",
      "Illustrative milestone from SRS page 19. Studio documentation must be checked before official publication.",
      undefined,
      undefined,
      false,
      i,
    );
    await db.historyMilestone.upsert({
      where: { contentId: c.id },
      update: {},
      create: { contentId: c.id, eraVi, eraEn },
    });
  }
  const pages = [
    [
      "gioi-thieu",
      "Một xưởng tranh bên sông Đuống",
      "A painting studio by the Duong River",
      "Website kể về giấy dó, màu tự nhiên và nghề in ván. Bản prototype trình diễn cấu trúc nội dung; thông tin cơ sở và ảnh xưởng chờ chủ dự án cung cấp.",
      "This website introduces dó paper, natural colours and woodblock printing. This prototype demonstrates content structure; studio details and photographs await the project owner.",
    ],
    [
      "tham-quan",
      "Ghé làng tranh Đông Hồ",
      "Visit Dong Ho village",
      "Bản đồ chỉ vị trí làng tranh, chưa xác nhận vị trí một cơ sở cụ thể. Trước khi đến, hãy liên hệ để xác nhận giờ mở cửa, giá vé và lịch hướng dẫn.",
      "The map shows the village, not a verified studio address. Contact the studio before travelling to confirm opening hours, admission and guided visits.",
    ],
    [
      "chinh-sach-bao-mat",
      "Chính sách bảo mật – bản nháp",
      "Privacy policy – draft",
      "Bản demo chỉ dùng dữ liệu kiểm thử. Thông tin đăng ký phục vụ xử lý buổi học; liên hệ phục vụ phản hồi; bản tin chỉ gửi sau xác nhận riêng. Chưa phải chính sách được chủ dự án duyệt. Không nhập dữ liệu sức khỏe thật vào demo.",
      "Use test data only in this demo. Booking details support class administration; contact details support replies; newsletters require separate confirmation. This draft has not been approved by the project owner. Do not enter real health information.",
    ],
    [
      "dieu-khoan",
      "Điều khoản – bản nháp",
      "Terms – draft",
      "Lịch học, phí tham khảo và nội dung tại prototype chỉ để trình diễn. Không thực hiện thanh toán. Nội dung chính thức, chính sách hủy và bản quyền cần được cơ sở xác nhận trước khi vận hành.",
      "Class dates, reference prices and content in this prototype are for demonstration. Do not make payments. Official content, cancellation policy and image rights require studio approval before operation.",
    ],
  ];
  for (const [slug, vi, en, sv, se] of pages) {
    const c = await add("PAGE", slug, vi, en, sv, se);
    await db.page.upsert({
      where: { contentId: c.id },
      update: {},
      create: { contentId: c.id },
    });
  }
  const artisan = await add(
    "ARTISAN",
    "ho-so-mau",
    "Hồ sơ nghệ nhân – chờ tư liệu",
    "Artisan profile – awaiting documentation",
    "Vị trí dành cho chân dung, tiểu sử, câu chuyện nghề và danh hiệu đã được xác minh. Đây là hồ sơ cấu trúc mẫu, không phải một nhân vật thật.",
    "Space for a verified portrait, biography, craft story and honours. This is a structural sample, not a real person.",
  );
  await db.artisan.upsert({
    where: { contentId: artisan.id },
    update: {},
    create: { contentId: artisan.id },
  });
  const posts = [
    [
      "giay-diep",
      "Từ giấy dó đến nền điệp",
      "From dó paper to a shell coating",
      "fish",
    ],
    ["mau-tu-nhien", "Bảng màu từ đất trời", "Colours from nature", "flower"],
    ["trai-nghiem", "Tự tay thử một bản in", "Try making a print", "pig"],
  ];
  for (const [slug, vi, en, img] of posts) {
    const c = await add(
      "POST",
      slug,
      vi,
      en,
      "Bài mẫu cho giao diện tin tức. Nội dung văn hóa và ảnh minh họa chính thức cần được cơ sở biên tập, xác minh trước khi đăng.",
      "Sample journal entry. Official cultural content and photographs need studio editing and verification before publication.",
      `/demo/${img}.svg`,
    );
    await db.post.upsert({
      where: { contentId: c.id },
      update: {},
      create: { contentId: c.id },
    });
  }
  for (const [slug, vi, en, img] of art.slice(0, 3)) {
    const painting = await db.content.findUniqueOrThrow({
      where: { kind_slug: { kind: "PAINTING", slug } },
      include: { painting: true },
    });
    const c = await add(
      "PRODUCT",
      slug,
      vi,
      en,
      "Catalog mẫu; vui lòng liên hệ để xác nhận kích thước, giá và khả năng cung cấp.",
      "Sample catalogue; please contact the studio to confirm dimensions, price and availability.",
      `/demo/${img}.svg`,
    );
    await db.product.upsert({
      where: { contentId: c.id },
      update: {},
      create: {
        contentId: c.id,
        paintingId: painting.painting?.id,
        size: "Chờ xác nhận / Awaiting confirmation",
        inStock: false,
      },
    });
  }
  const faq = [
    [
      "tai-khoan",
      "Có cần tài khoản để đăng ký không?",
      "Do I need an account to book?",
      "Không. Bạn tra cứu bằng mã đăng ký và số điện thoại.",
      "No. Look up your booking using its code and your phone number.",
    ],
    [
      "thanh-toan",
      "Thanh toán workshop thế nào?",
      "How do I pay for a workshop?",
      "Bản demo không thu phí. Khi vận hành, xưởng hiển thị hướng dẫn thanh toán tại chỗ hoặc chuyển khoản đã cấu hình.",
      "The demo collects no payments. The live studio will show its configured on-site or bank-transfer instructions.",
    ],
    [
      "huy",
      "Tôi có thể tự hủy đăng ký không?",
      "Can I cancel my booking?",
      "Có, khi còn trước buổi học ít nhất thời gian quy định, mặc định 24 giờ.",
      "Yes, before the cancellation deadline, which defaults to 24 hours before the class.",
    ],
    [
      "cho",
      "Danh sách chờ có giữ chỗ không?",
      "Does the waiting list reserve seats?",
      "Chưa. Khi có đủ chỗ cho cả nhóm theo thứ tự chờ, lời mời có thời hạn riêng được gửi qua email.",
      "No. When enough seats are available for your group in queue order, a time-limited invitation will be emailed.",
    ],
    [
      "tre-em",
      "Trẻ em có chiếm chỗ không?",
      "Do children count towards capacity?",
      "Có. Trẻ dưới tuổi tối thiểu cần có người lớn đi kèm.",
      "Yes. Children below the minimum age need an accompanying adult.",
    ],
    [
      "nhom",
      "Đặt lịch cho trường học như thế nào?",
      "How do schools arrange a visit?",
      "Gửi liên hệ chủ đề Đoàn – trường học để trao đổi số người và lịch phù hợp.",
      "Send a Groups / schools enquiry to discuss group size and a suitable date.",
    ],
  ];
  for (const [slug, vi, en, sv, se] of faq) {
    const c = await add("FAQ", slug, vi, en, sv, se);
    await db.faq.upsert({
      where: { contentId: c.id },
      update: {},
      create: { contentId: c.id, group: "workshop" },
    });
  }
  await db.siteSetting.upsert({
    where: { key: "site" },
    update: {},
    create: {
      key: "site",
      value: {
        stats: [
          {
            value: "5",
            labelVi: "màu trong tư liệu SRS",
            labelEn: "colours in the SRS",
          },
          {
            value: "5",
            labelVi: "công đoạn in tranh",
            labelEn: "printing steps",
          },
          {
            value: "6",
            labelVi: "mẫu bố cục thư viện",
            labelEn: "gallery layout samples",
          },
          {
            value: "2",
            labelVi: "workshop minh họa",
            labelEn: "sample workshops",
          },
        ],
      },
    },
  });
  console.log(
    "Idempotent demo seed ready. Existing content, dates and registrations were preserved.",
  );
}
main().finally(() => db.$disconnect());
