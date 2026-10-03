import "dotenv/config";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import type { ContentKind, Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { settingsSchema } from "../src/lib/config";
import paintings from "../src/data/paintings.json";

type Asset = { key?: string; width?: number; height?: number; size?: number };
const html = (paragraphs: string[]) =>
  paragraphs.map((p) => `<p>${p}</p>`).join("");
async function main() {
  const version = "source-images-tour-v1";
  if (await db.siteSetting.findUnique({ where: { key: version } })) {
    console.log(
      "Source content already imported; subsequent CMS edits preserved.",
    );
    return;
  }
  const assets: Asset[] = JSON.parse(
    await readFile("public/tour/assets.json", "utf8"),
  );
  await mkdir(".local/content-backups", { recursive: true });
  const oldContent = await db.content.findMany({ where: { isDemo: true } });
  const oldSettings = await db.siteSetting.findUnique({
    where: { key: "site" },
  });
  await writeFile(
    `.local/content-backups/${version}.json`,
    JSON.stringify({ content: oldContent, settings: oldSettings }, null, 2),
  );
  await db.$transaction(
    async (tx) => {
      async function media(key: string, altVi: string, altEn: string) {
        const asset = assets.find((a) => a.key === key);
        if (!asset?.width || !asset.height || !asset.size)
          throw new Error(`Missing prepared asset: ${key}`);
        return tx.media.upsert({
          where: { key },
          update: {},
          create: {
            key,
            mime: "image/webp",
            size: asset.size,
            width: asset.width,
            height: asset.height,
            altVi,
            altEn,
            isDemo: false,
            scanStatus: "DECODED_LOCAL",
          },
        });
      }
      async function put(
        kind: ContentKind,
        slug: string,
        titleVi: string,
        titleEn: string,
        summaryVi: string,
        summaryEn: string,
        bodyVi: string,
        bodyEn: string,
        key?: string,
        categorySlug?: string,
        sortOrder = 0,
      ) {
        const existing = await tx.content.findUnique({
          where: { kind_slug: { kind, slug } },
        });
        const image = key ? await media(key, summaryVi, summaryEn) : null;
        const category = categorySlug
          ? await tx.category.findUnique({
              where: { kind_slug: { kind, slug: categorySlug } },
            })
          : null;
        const data = {
          titleVi,
          titleEn,
          summaryVi,
          summaryEn,
          bodyVi,
          bodyEn,
          mediaId: image?.id,
          categoryId: category?.id,
          isDemo: false,
          status: "PUBLISHED",
          publishedAt: new Date(),
          sortOrder,
        } satisfies Prisma.ContentUncheckedUpdateInput;
        if (existing)
          return existing.isDemo
            ? tx.content.update({ where: { id: existing.id }, data })
            : existing;
        return tx.content.create({
          data: { ...data, kind, slug, status: "PUBLISHED" },
        });
      }
      const ids: string[] = [];
      for (const [i, p] of paintings.entries()) {
        const key = `/images/paintings/${p.slug}.webp`;
        const c = await put(
          "PAINTING",
          p.slug,
          p.titleVi,
          p.titleEn,
          p.summaryVi,
          p.summaryEn,
          html([p.summaryVi, p.detailVi]),
          html([p.summaryEn, p.detailEn]),
          key,
          p.category,
          i,
        );
        const painting = await tx.painting.upsert({
          where: { contentId: c.id },
          update: {},
          create: {
            contentId: c.id,
            color: p.color,
            materialVi:
              "Tranh khắc gỗ dân gian; liên hệ để chọn giấy và bản in.",
            materialEn:
              "Folk woodblock print; enquire about paper and available editions.",
          },
        });
        if (i < 3) ids.push(c.id);
        const product = await put(
          "PRODUCT",
          p.slug,
          p.titleVi,
          p.titleEn,
          p.summaryVi,
          p.summaryEn,
          html([p.detailVi]),
          html([p.detailEn]),
          key,
          undefined,
          i,
        );
        await tx.product.upsert({
          where: { contentId: product.id },
          update: {},
          create: {
            contentId: product.id,
            paintingId: painting.id,
            size: "Liên hệ chọn kích thước / Enquire about sizes",
            inStock: false,
          },
        });
      }
      await tx.content.updateMany({
        where: {
          isDemo: true,
          kind: { in: ["PAINTING", "PRODUCT", "VIDEO", "ARTISAN"] },
        },
        data: { status: "DRAFT" },
      });
      for (const [oldSlug, newSlug] of [
        ["ca-minh-hoa", "ly-ngu-vong-nguyet"],
        ["lon-minh-hoa", "dan-lon-am-duong"],
        ["hoa-minh-hoa", "vinh-hoa-phu-quy"],
        ["ca-mau-son", "ly-ngu-vong-nguyet"],
        ["lon-net-muc", "dan-lon-am-duong"],
        ["hoa-sac-hoe", "vinh-hoa-phu-quy"],
      ]) {
        await tx.redirect.upsert({
          where: { kind_oldSlug: { kind: "PAINTING", oldSlug } },
          update: {},
          create: { kind: "PAINTING", oldSlug, newSlug },
        });
      }
      const pages = [
        {
          slug: "gioi-thieu",
          vi: "Tranh Đông Hồ — câu chuyện trên giấy điệp",
          en: "Dong Ho — stories on shell-coated paper",
          sv: "Khám phá những bức tranh dân gian, nghề in ván và không gian trưng bày văn hóa Đông Hồ.",
          se: "Explore folk prints, the woodblock craft and an exhibition of Dong Ho culture.",
          pv: [
            "Đông Hồ là một dòng tranh khắc gỗ dân gian gắn với làng Đông Hồ, Bắc Ninh. Hình ảnh con vật, con người và những sinh hoạt quen thuộc được kể bằng nét mực, mảng màu và bố cục cô đọng.",
            "Một bức tranh có thể mở ra nhiều cách nhìn: tìm một cử chỉ nhỏ, đọc nhịp của đoàn rước, hay so sánh hai vế tranh. Thư viện giới thiệu Đám cưới chuột, Hứng dừa, Đàn gà và những tác phẩm khác để bạn tự quan sát từng chi tiết.",
            "Từ phòng trưng bày, hãy đi tiếp đến ván khắc và các công đoạn làm tranh trong chuyến tham quan ảo. Nếu muốn thử in trực tiếp, xem lịch workshop hoặc gửi lời nhắn để trao đổi về một chuyến đi cùng gia đình, lớp học.",
          ],
          pe: [
            "Dong Ho is a folk woodblock-printing tradition associated with Dong Ho village in Bac Ninh. Animals, people and familiar scenes are told through ink outlines, colour fields and compact compositions.",
            "A print invites different ways of looking: find a gesture, follow a procession, or compare a pair of panels. The collection includes The rats’ wedding, Catching coconuts, A hen and her chicks and other works to explore in detail.",
            "Continue from the exhibition to woodblocks and the craft process in the virtual tour. For a hands-on visit, browse workshops or send an enquiry about a family or school outing.",
          ],
          key: "/images/visit/tuong-tranh.webp",
        },
        {
          slug: "tham-quan",
          vi: "Ghé làng tranh Đông Hồ",
          en: "Visit Dong Ho village",
          sv: "Bắt đầu bằng một chuyến đi trong ảnh, rồi lên kế hoạch đến với làng tranh ở Bắc Ninh.",
          se: "Start with a journey through photographs, then plan a visit to the village in Bac Ninh.",
          pv: [
            "Trong khu trưng bày, tranh, ván khắc và các mô hình công đoạn được đặt cạnh nhau để kể câu chuyện làm tranh. Chuyến tham quan ảo giúp bạn quan sát không gian trước khi đi thực tế.",
            "Trước chuyến đi, hãy trao đổi về số người, nhu cầu hướng dẫn và hoạt động muốn trải nghiệm. Giờ tiếp đón, giá vé nếu có và địa điểm hẹn cần được xác nhận trực tiếp để phù hợp với lịch của nhóm.",
            "Nếu đi cùng trẻ nhỏ, hãy chọn thời lượng vừa sức và có người lớn đồng hành. Trong không gian trưng bày, giữ khoảng cách với hiện vật và thực hiện hướng dẫn của người phụ trách.",
          ],
          pe: [
            "Prints, woodblocks and craft dioramas sit together in the exhibition. The virtual tour lets you look around before an in-person visit.",
            "Discuss your group size, guiding needs and preferred activities before travelling. Confirm opening times, any admission fee and the meeting point directly so the visit fits your group.",
            "With young children, choose an appropriate duration and bring accompanying adults. Keep a safe distance from exhibits and follow the staff’s instructions.",
          ],
          key: "/images/visit/cho-tranh.webp",
        },
        {
          slug: "chinh-sach-bao-mat",
          vi: "Chính sách bảo mật",
          en: "Privacy policy",
          sv: "Thông tin bạn gửi được sử dụng để xử lý đăng ký, trả lời liên hệ và gửi bản tin khi có sự đồng ý riêng.",
          se: "Information you submit supports bookings, enquiries and newsletters with separate consent.",
          pv: [
            "Form đăng ký thu họ tên, số điện thoại, email, số người tham gia và thông tin cần thiết cho buổi học. Form liên hệ thu thông tin phản hồi và lời nhắn. Không cung cấp dữ liệu nhạy cảm hoặc thông tin sức khỏe không cần thiết.",
            "Thông tin đăng ký và liên hệ được xử lý bởi người quản trị có quyền truy cập. Các tệp bạn gửi qua form liên hệ không được công khai. Đăng ký bản tin là lựa chọn riêng, cần xác nhận qua email; bạn có thể hủy nhận tin bằng liên kết trong thư.",
            "Website không yêu cầu tài khoản khách. Bạn dùng mã đăng ký và số điện thoại để tra cứu. Khi cần chỉnh sửa thông tin hoặc trao đổi về quyền riêng tư, hãy gửi liên hệ và không đăng dữ liệu cá nhân trong nội dung công khai.",
            "Cookie cần thiết hỗ trợ phiên làm việc và lựa chọn ngôn ngữ. Cookie phân tích chỉ được sử dụng nếu bạn đồng ý, và có thể bị từ chối qua bảng lựa chọn cookie.",
          ],
          pe: [
            "Booking forms collect your name, phone, email, party size and details needed for the class. Enquiry forms collect reply details and your message. Avoid unnecessary sensitive or health information.",
            "Booking and enquiry information is handled by authorised administrators. Enquiry attachments are private. Newsletter subscription is a separate choice requiring email confirmation; unsubscribe using the link in a message.",
            "No guest account is required. Use your booking code and phone number to look up a reservation. Contact us to correct information or discuss privacy, and do not put personal information in public content.",
            "Necessary cookies support sessions and language choices. Analytics cookies are used only with your consent and can be refused in the cookie settings.",
          ],
          key: undefined,
        },
        {
          slug: "dieu-khoan",
          vi: "Điều khoản sử dụng",
          en: "Terms of use",
          sv: "Hướng dẫn sử dụng nội dung, liên hệ và đăng ký hoạt động trên website.",
          se: "Guidance for viewing content, making enquiries and booking activities.",
          pv: [
            "Nội dung và ảnh trên website phục vụ tìm hiểu văn hóa tranh Đông Hồ. Khi muốn sử dụng lại ảnh hoặc nội dung, hãy trao đổi với người có quyền sử dụng; không mặc nhiên coi việc hiển thị trên website là giấy phép sao chép.",
            "Gửi form workshop là yêu cầu đăng ký. Trạng thái đã nhận đăng ký khác với việc cơ sở xác nhận buổi học. Danh sách chờ chưa giữ chỗ; hãy theo dõi trạng thái và hướng dẫn gửi kèm mã đăng ký.",
            "Website không có thanh toán trực tuyến. Chỉ thực hiện thanh toán sau khi nhận xác nhận và hướng dẫn cụ thể từ cơ sở. Giá, thời gian và chính sách hủy hiển thị tại từng buổi cần được xem trước khi đăng ký.",
            "Khi gửi liên hệ hoặc ảnh đính kèm, hãy bảo đảm bạn có quyền gửi nội dung đó. Không gửi thông tin của người khác khi chưa được đồng ý hoặc nội dung có thể gây hại.",
          ],
          pe: [
            "Content and photographs support exploration of Dong Ho culture. Ask the rights holder before reusing them; display on this website does not itself grant a copying licence.",
            "Submitting a workshop form is a booking request. Receipt differs from confirmation by the studio. A waiting-list entry does not reserve seats; follow the status and instructions accompanying your booking code.",
            "There is no online checkout. Pay only after receiving confirmation and specific instructions from the studio. Review the class’s price, time and cancellation policy before booking.",
            "Ensure you have permission to send messages and attachments. Do not submit another person’s information without consent or harmful content.",
          ],
          key: undefined,
        },
      ];
      for (const p of pages) {
        const c = await put(
          "PAGE",
          p.slug,
          p.vi,
          p.en,
          p.sv,
          p.se,
          html(p.pv),
          html(p.pe),
          p.key,
        );
        await tx.page.upsert({
          where: { contentId: c.id },
          update: {},
          create: { contentId: c.id },
        });
      }
      const posts = [
        [
          "giay-diep",
          "Từ giấy dó đến nền điệp",
          "From dó paper to a shell coating",
          "Giấy và lớp nền là nơi một bức tranh bắt đầu. Trong tủ trưng bày, các bản in được đặt cạnh những vật liệu và dụng cụ để người xem quan sát.",
          "Paper and its ground begin a print. Display cases place prints beside materials and tools for closer observation.",
          "Hãy nhìn phần nền quanh các hình in: màu nền, vệt giấy và nét đen cùng tạo cảm giác của bức tranh. Tủ trưng bày cho phép đối chiếu các hình ảnh ở khoảng cách gần. Đi tiếp trong tour để xem những mô hình làm giấy và quét nền; sau đó trở lại thư viện để so sánh nền của Hứng dừa với cặp Vinh hoa – Phú quý.",
          "Look at the ground around the figures: paper colour, surface and black lines work together. Display cases let you compare the images closely. Continue through the tour’s craft dioramas, then compare the backgrounds of Catching coconuts and Vinh Hoa – Phu Quy.",
          "giay-diep",
        ],
        [
          "mau-tu-nhien",
          "Nét mực và những mảng màu",
          "Ink outlines and colour fields",
          "Đỏ, vàng, xanh và nét đen hiện diện trong nhiều bức tranh. Mỗi bố cục cho thấy một cách đặt màu khác nhau.",
          "Red, yellow, green and black outlines appear across the prints. Each composition arranges them differently.",
          "Trong Đàn gà, nhiều mảng nhỏ đan nhau quanh gà mẹ. Với Lợn ăn cây ráy, một thân vàng lớn chiếm gần hết khung tranh. Còn Lý ngư vọng nguyệt đặt các nét vảy đen trên nền nước xanh. Bạn có thể mở từng ảnh, phóng to và dùng bộ lọc màu trong thư viện để tìm những cách phối màu tương tự.",
          "A hen and her chicks combines many small shapes around the hen. A pig eating a taro plant fills the frame with a large yellow body. Carp gazing at the moon sets black scale patterns against blue water. Open each image, enlarge it and use the collection’s colour filters to find related arrangements.",
          "che-mau",
        ],
        [
          "trai-nghiem",
          "Đi từ bức tranh đến ván khắc",
          "From a print to its woodblock",
          "Nét trên mặt giấy có một hình tương ứng trên ván. Những ván khắc trong tủ trưng bày giúp kết nối hai cách nhìn về cùng một hình ảnh.",
          "Printed lines have a counterpart on a wooden block. The displayed blocks connect two views of the same image.",
          "Quan sát ván khắc là một cách hiểu vì sao đường nét quan trọng trong tranh in. Bề mặt có những phần nổi và phần được lấy đi, khác với hình ảnh phẳng trên giấy. Trong chuyến tham quan, hãy tìm tủ ván khắc rồi đối chiếu với các tranh treo gần đó. Nếu muốn thử thao tác in, xem lịch trải nghiệm và chọn một buổi phù hợp.",
          "A block helps explain the importance of line in printing. Its raised and recessed areas differ from the flat image on paper. Find the woodblock case in the tour and compare it with nearby prints. To try printing yourself, browse the workshop schedule and choose a suitable class.",
          "van-khac",
        ],
      ];
      for (const [i, p] of posts.entries()) {
        const c = await put(
          "POST",
          p[0],
          p[1],
          p[2],
          p[3],
          p[4],
          html([p[3], p[5]]),
          html([p[4], p[6]]),
          `/images/visit/${p[7]}.webp`,
          undefined,
          i,
        );
        await tx.post.upsert({
          where: { contentId: c.id },
          update: {},
          create: { contentId: c.id },
        });
      }
      const artisan = await put(
        "ARTISAN",
        "nguoi-lam-tranh",
        "Người làm tranh Đông Hồ",
        "The people who make Dong Ho prints",
        "Một bức tranh đi qua nhiều đôi tay: làm nền giấy, chuẩn bị màu, khắc ván và in. Không gian trưng bày đưa người xem lại gần các công đoạn ấy.",
        "A print passes through many hands: preparing paper, mixing colour, carving and printing. The exhibition brings these stages closer.",
        html([
          "Nghề in ván không chỉ nằm ở bức tranh đã hoàn thiện. Bàn làm việc, dụng cụ và ván khắc cho thấy những thao tác cần sự tập trung và kinh nghiệm.",
          "Các nhân vật trong ảnh là mô hình trưng bày công đoạn làm tranh. Chúng giúp hình dung tư thế làm việc và mối liên hệ giữa vật liệu, dụng cụ và thành phẩm; đây không phải ảnh chân dung của một nghệ nhân cụ thể.",
          "Bạn có thể xem quanh khu trưng bày trong tour, tìm hiểu từng bức tranh hoặc gửi lời nhắn để trao đổi về nghề và hoạt động trải nghiệm.",
        ]),
        html([
          "Woodblock printing extends beyond the finished sheet. Worktables, tools and carved blocks show the concentration and experience behind each stage.",
          "The figures in this photograph are craft diorama mannequins, illustrating working positions and the relationship between materials, tools and prints. They are not a portrait of an individual artisan.",
          "Look around the exhibition in the tour, explore the prints or send an enquiry about the craft and hands-on activities.",
        ]),
        "/images/visit/che-mau.webp",
      );
      await tx.artisan.upsert({
        where: { contentId: artisan.id },
        update: {},
        create: { contentId: artisan.id },
      });
      await tx.redirect.upsert({
        where: { kind_oldSlug: { kind: "ARTISAN", oldSlug: "ho-so-mau" } },
        update: {},
        create: {
          kind: "ARTISAN",
          oldSlug: "ho-so-mau",
          newSlug: artisan.slug,
        },
      });
      const workshopImages = [
        "/images/visit/van-khac.webp",
        "/images/visit/giay-diep.webp",
      ];
      const workshops = await tx.content.findMany({
        where: { kind: "WORKSHOP", isDemo: true },
        orderBy: { slug: "asc" },
      });
      for (const [i, c] of workshops.entries()) {
        const m = await media(
          workshopImages[i % 2],
          "Không gian trưng bày ván khắc và quy trình làm tranh",
          "Woodblocks and craft-process displays",
        );
        await tx.content.update({
          where: { id: c.id },
          data: {
            mediaId: m.id,
            summaryVi:
              "Tìm hiểu vật liệu, quan sát ván khắc và thử thao tác để tạo nên một bản in của riêng bạn.",
            summaryEn:
              "Explore materials, inspect a woodblock and try the steps of making your own print.",
            bodyVi: html([
              "Buổi trải nghiệm bắt đầu bằng việc quan sát tranh và dụng cụ. Người hướng dẫn giới thiệu các thao tác, sau đó bạn thử in theo từng bước.",
              "Chọn buổi còn chỗ, điền số người lớn và trẻ em, rồi kiểm tra tổng tạm tính trước khi gửi. Nếu buổi đã đầy, nhóm có thể vào danh sách chờ. Đăng ký được tiếp nhận trước khi cơ sở xác nhận.",
              "Mặc trang phục thoải mái, có thể tiếp xúc với màu in. Với trẻ em, bố trí người lớn đi cùng và xem độ tuổi phù hợp của chương trình.",
            ]),
            bodyEn: html([
              "Start by looking at prints and tools. A guide introduces the technique before you try printing step by step.",
              "Choose an available session, enter adults and children and review the estimate. A full class can accept a waiting-list request. Receipt of a request precedes confirmation by the studio.",
              "Wear comfortable clothing suitable for working with ink. Accompany children and check the programme’s recommended age.",
            ]),
          },
        });
      }
      const milestones = [
        [
          "hinh-thanh",
          "Tranh trong đời sống",
          "Prints in everyday life",
          "Truyền thống",
          "Tradition",
          "Tranh in ván Đông Hồ gắn với đời sống văn hóa ở Bắc Ninh. Con người, con vật và những sinh hoạt quen thuộc trở thành chủ đề của tranh.",
          "Dong Ho woodblock prints belong to the cultural life of Bac Ninh. People, animals and familiar activities become their subjects.",
        ],
        [
          "cho-tranh",
          "Tranh và ngày Tết",
          "Prints and Tet",
          "Ngày Tết",
          "Lunar New Year",
          "Theo nghiên cứu của IRCI, tranh Đông Hồ được dùng để trang trí dịp Tết. Không gian chợ tranh trong khu trưng bày gợi lại mối liên hệ ấy.",
          "IRCI research describes the traditional use of Dong Ho prints as Lunar New Year decorations. The market diorama evokes that connection.",
        ],
        [
          "de-tai",
          "Nghiên cứu bảo tồn nghề",
          "Research to safeguard the craft",
          "2013–2015",
          "2013–2015",
          "IRCI và Viện Văn hóa Nghệ thuật quốc gia Việt Nam phối hợp khảo sát những yếu tố ảnh hưởng đến việc truyền nghề in ván Đông Hồ.",
          "IRCI and the Viet Nam National Institute of Culture and Arts Studies jointly surveyed factors affecting transmission of Dong Ho printing.",
        ],
        [
          "tram-lang",
          "Cộng đồng và truyền nghề",
          "Community and transmission",
          "Tháng 1/2015",
          "January 2015",
          "Hội thảo tại Bắc Ninh và Hà Nội trao đổi về vai trò của trung tâm cộng đồng trong việc gìn giữ nghề in tranh.",
          "Workshops in Bac Ninh and Hanoi discussed the role of a community centre in sustaining the printing craft.",
        ],
        [
          "bao-ton",
          "Tiếp tục trao đổi về bảo tồn",
          "Continuing the safeguarding discussion",
          "Tháng 11/2019",
          "November 2019",
          "IRCI ghi nhận hoạt động tham dự hội nghị về tranh in ván Đông Hồ. Nghiên cứu, trưng bày và trải nghiệm là những cách tiếp tục chia sẻ câu chuyện nghề.",
          "IRCI records participation in a Dong Ho woodblock-printing conference. Research, exhibitions and hands-on experiences continue to share the craft’s story.",
        ],
      ];
      for (const [i, m] of milestones.entries()) {
        const c = await put(
          "MILESTONE",
          m[0],
          m[1],
          m[2],
          m[5],
          m[6],
          html([m[5]]),
          html([m[6]]),
          undefined,
          undefined,
          i,
        );
        await tx.historyMilestone.upsert({
          where: { contentId: c.id },
          update: { eraVi: m[3], eraEn: m[4], yearFrom: null, yearTo: null },
          create: { contentId: c.id, eraVi: m[3], eraEn: m[4] },
        });
      }
      const paymentFaq = await tx.content.findUnique({
        where: { kind_slug: { kind: "FAQ", slug: "thanh-toan" } },
      });
      if (paymentFaq?.isDemo)
        await tx.content.update({
          where: { id: paymentFaq.id },
          data: {
            summaryVi:
              "Thanh toán sau khi cơ sở xác nhận và gửi hướng dẫn. Website không có thanh toán trực tuyến.",
            summaryEn:
              "Pay after the studio confirms and sends instructions. There is no online checkout.",
            bodyVi: html([
              "Thanh toán sau khi cơ sở xác nhận và gửi hướng dẫn. Website không có thanh toán trực tuyến.",
            ]),
            bodyEn: html([
              "Pay after the studio confirms and sends instructions. There is no online checkout.",
            ]),
          },
        });
      const settings = settingsSchema.parse(oldSettings?.value ?? {});
      settings.stats = [
        {
          value: "9",
          labelVi: "bức tranh trong bộ sưu tập",
          labelEn: "prints in the collection",
        },
        {
          value: "4",
          labelVi: "điểm tham quan trong ảnh",
          labelEn: "panorama viewpoints",
        },
        { value: "5", labelVi: "công đoạn làm tranh", labelEn: "craft stages" },
      ];
      settings.heroPaintingIds = ids;
      if (settings.hoursVi.includes("chưa")) {
        settings.hoursVi = "Liên hệ hẹn lịch tham quan";
        settings.hoursEn = "Contact us to arrange your visit";
      }
      if (settings.bankVi.includes("demo")) {
        settings.bankVi =
          "Chỉ thanh toán sau khi cơ sở xác nhận và gửi hướng dẫn cụ thể.";
        settings.bankEn =
          "Pay only after the studio confirms and sends specific instructions.";
      }
      await tx.siteSetting.upsert({
        where: { key: "site" },
        update: { value: settings },
        create: { key: "site", value: settings },
      });
      await tx.siteSetting.create({
        data: {
          key: version,
          value: {
            importedAt: new Date().toISOString(),
            paintings: 9,
            panoramas: 4,
          },
        },
      });
    },
    { timeout: 60000 },
  );
  console.log(
    "Source content imported. Original assets, registrations and custom CMS entries preserved; template cards hidden rather than deleted.",
  );
}
main().finally(() => db.$disconnect());
