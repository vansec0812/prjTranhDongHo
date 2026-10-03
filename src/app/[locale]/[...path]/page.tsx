import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { ContentKind } from "@prisma/client";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  contents,
  findContent,
  getSettings,
  isLocale,
  text,
  summary,
  body,
  localHref,
  contentHref,
  type ContentRecord,
  type Locale,
} from "@/lib/content";
import { publicSessions } from "@/lib/sessions";
import { fold, money } from "@/lib/domain";
import { vi, en } from "@/i18n/messages";
import { ContentCard, MediaView } from "@/components/content-card";
import { SessionCard } from "@/components/session-card";
import { Booking } from "@/components/booking";
import { Lookup } from "@/components/lookup";
import { ContactForm } from "@/components/contact-form";
import { Timeline } from "@/components/history";
import { Lightbox } from "@/components/lightbox";
import { VideoPlayer } from "@/components/video-player";
import { Share } from "@/components/share";
import { NewsletterConfirm } from "@/components/newsletter-confirm";
import { TourExperience } from "@/components/tour";
import { tour, tourScene } from "@/lib/tour";
import { mediaUrl } from "@/lib/media-url";
import { Intro } from "@/components/page-intro";
import {
  ButtonLink,
  TextLink,
  Wave,
  Empty,
  Alert,
  Badge,
} from "@/components/ui";
import sanitizeHtml from "sanitize-html";
type Props = {
  params: Promise<{ locale: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const routeKinds: Record<string, ContentKind | undefined> = {
  "thu-vien-tranh": "PAINTING",
  video: "VIDEO",
  workshop: "WORKSHOP",
  "nghe-nhan": "ARTISAN",
  "tin-tuc": "POST",
  "san-pham": "PRODUCT",
};
const listKey: Record<string, string> = {
  "thu-vien-tranh": "gallery",
  video: "video",
  workshop: "workshop",
  "nghe-nhan": "artisan",
  "tin-tuc": "posts",
  "san-pham": "products",
  "lich-su": "history",
  "lien-he": "contact",
  "tim-kiem": "search",
  "hoi-dap": "faq",
  "tra-cuu": "lookup",
  "tham-quan-360": "tour",
  "virtual-tour": "tour",
};
const get = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : "";
function Rich({ html }: { html: string }) {
  return (
    <div
      className="rich-text"
      dangerouslySetInnerHTML={{
        __html: sanitizeHtml(html, {
          allowedTags: [
            "p",
            "h2",
            "h3",
            "strong",
            "em",
            "ul",
            "ol",
            "li",
            "blockquote",
            "a",
            "br",
          ],
          allowedAttributes: { a: ["href", "rel"] },
          allowedSchemes: ["https", "http", "mailto", "tel"],
        }),
      }}
    />
  );
}
function Fallback({ item, locale }: { item: ContentRecord; locale: Locale }) {
  return locale === "en" && (!item.titleEn || !item.bodyEn) ? (
    <Alert>{en.site.fallback}</Alert>
  ) : null;
}
export async function generateMetadata({
  params,
}: {
  params: Props["params"];
}): Promise<Metadata> {
  const { locale, path } = await params;
  const enLocale = locale === "en";
  const t = (enLocale ? en : vi).site;
  const kind = routeKinds[path[0]];
  const item =
    path[1] && kind
      ? await findContent(kind, path[1])
      : [
            "gioi-thieu",
            "tham-quan",
            "dieu-khoan",
            "chinh-sach-bao-mat",
          ].includes(path[0])
        ? await findContent("PAGE", path[0])
        : null;
  const key = listKey[path[path.length - 1]];
  const title = item
    ? text(item, enLocale ? "en" : "vi")
    : key
      ? Reflect.get(t, key)
      : "Tranh Đông Hồ";
  const pathname = "/" + path.join("/");
  return {
    title: `${title} · Tranh Đông Hồ`,
    description: item
      ? summary(item, enLocale ? "en" : "vi")
      : "Giấy dó, màu tự nhiên và nghề in ván Đông Hồ.",
    alternates: {
      canonical: localHref(enLocale ? "en" : "vi", pathname),
      languages: {
        vi: localHref("vi", pathname),
        en: localHref("en", pathname),
      },
    },
    openGraph: {
      title: String(title),
      description: item ? summary(item, enLocale ? "en" : "vi") : undefined,
    },
    robots:
      process.env.APP_MODE === "prototype" ||
      pathname.includes("tra-cuu") ||
      pathname.includes("ban-tin")
        ? { index: false, follow: false }
        : undefined,
  };
}
export default async function PublicPage({ params, searchParams }: Props) {
  const { locale, path } = await params;
  if (!isLocale(locale) || path.length > 2) notFound();
  const query = await searchParams;
  const section = path[0];
  const slug = path[1];
  const t = (locale === "en" ? en : vi).site;
  const w = (locale === "en" ? en : vi).workshop;
  const settings = await getSettings();
  const base = "/" + path.join("/");
  if (["tham-quan-360", "virtual-tour"].includes(section) && !slug) {
    const canonical = localHref(locale, "/tham-quan-360");
    if (
      (locale === "en" && section !== "virtual-tour") ||
      (locale === "vi" && section !== "tham-quan-360")
    )
      permanentRedirect(
        canonical +
          (get(query.diem)
            ? `?diem=${encodeURIComponent(get(query.diem))}`
            : ""),
      );
    const open = (await publicSessions()).find(
      (s) => s.status === "OPEN" && s.available > 0,
    );
    return (
      <TourExperience
        configuration={tour}
        initialId={tourScene(get(query.diem)).id}
        locale={locale}
        hasOpenSession={Boolean(open)}
        workshopHref={
          open
            ? localHref(locale, `/workshop/${open.slug}?buoi=${open.id}`)
            : localHref(locale, "/workshop")
        }
      />
    );
  }
  if (section === "workshop" && slug === "tra-cuu")
    return (
      <div className="container section">
        <Intro locale={locale} title={t.lookup} section={t.workshop} />
        <Lookup locale={locale} invite={get(query.invite)} />
      </div>
    );
  if (section === "ban-tin" && !slug)
    return (
      <div className="container section">
        <Intro locale={locale} title={t.newsletter} section="Email" />
        <div className="prose-width">
          <NewsletterConfirm
            token={get(query.token)}
            action={get(query.action)}
            locale={locale}
          />
        </div>
      </div>
    );
  if (section === "lien-he" && !slug) {
    const painting = get(query.tranh)
      ? await findContent("PAINTING", get(query.tranh))
      : null;
    return (
      <div className="container section">
        <Intro
          locale={locale}
          title={t.contact}
          section={
            locale === "en"
              ? "FROM YOUR IDEAS TO THE STUDIO"
              : "TỪ Ý TƯỞNG CỦA BẠN ĐẾN XƯỞNG"
          }
        />
        <div className="details-layout">
          <ContactForm
            locale={locale}
            topic={get(query["chu-de"])}
            painting={
              painting?.painting
                ? { id: painting.painting.id, title: text(painting, locale) }
                : undefined
            }
          />
          <div className="stack">
            <h2>{locale === "en" ? settings.studioEn : settings.studioVi}</h2>
            <p>{locale === "en" ? settings.addressEn : settings.addressVi}</p>
            <p>{locale === "en" ? settings.hoursEn : settings.hoursVi}</p>
            {settings.phone && (
              <a className="text-link" href={`tel:${settings.phone}`}>
                {settings.phone}
              </a>
            )}
            {settings.email && (
              <a className="text-link" href={`mailto:${settings.email}`}>
                {settings.email}
              </a>
            )}
            <TextLink href={localHref(locale, "/tham-quan")}>
              {t.visit}
            </TextLink>
          </div>
        </div>
      </div>
    );
  }
  if (section === "lich-su" && !slug) {
    const milestones = await contents("MILESTONE");
    const categories = await db.category.findMany({
      where: { kind: "PAINTING" },
      orderBy: { sortOrder: "asc" },
    });
    const steps =
      locale === "en"
        ? [
            "Dó paper & shell coating",
            "Making natural colours",
            "Carving blocks",
            "Printing each colour",
            "Drying & finishing",
          ]
        : [
            "Giấy dó & quét điệp",
            "Chế màu tự nhiên",
            "Khắc ván",
            "In từng màu",
            "Phơi & hoàn thiện",
          ];
    const descriptions =
      locale === "en"
        ? [
            "Shell powder mixed with paste gives the paper a luminous ground.",
            "Bamboo-leaf charcoal, vermilion stones, sophora flowers and indigo.",
            "Colour blocks and the intricate black line block are carved separately.",
            "Print one colour at a time; the black outline is printed last.",
            "Dry in a ventilated place and check the printed layers.",
          ]
        : [
            "Bột điệp trộn hồ, quét lên giấy để tạo nền ánh.",
            "Than lá tre, sỏi son, hoa hòe, lá chàm – mỗi màu một cách làm.",
            "Ván nét và ván màu khắc riêng; ván nét được khắc tỉ mỉ.",
            "Mỗi lần in một màu, chờ khô rồi in tiếp; nét đen in sau cùng.",
            "Phơi nơi thoáng, kiểm tra độ đều của các lớp màu.",
          ];
    return (
      <div className="container section">
        <Intro
          locale={locale}
          title={
            locale === "en" ? "The history of the craft" : "Lịch sử hình thành"
          }
          description={
            locale === "en"
              ? "From the year-end painting market to the studio of today."
              : "Từ những phiên chợ tranh tháng Chạp đến xưởng in hôm nay."
          }
          section={locale === "en" ? "BY THE DUONG RIVER" : "BÊN BỜ SÔNG ĐUỐNG"}
        />
        <Timeline
          locale={locale}
          items={milestones.map((m) => ({
            id: m.id,
            title: text(m, locale),
            era:
              locale === "en"
                ? (m.milestone?.eraEn ?? "")
                : (m.milestone?.eraVi ?? ""),
            description: summary(m, locale),
          }))}
        />
        <Wave />
        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                {locale === "en"
                  ? "FROM PAPER TO PRINT"
                  : "TỪ GIẤY DÓ ĐẾN BỨC TRANH"}
              </p>
              <h2>
                {locale === "en"
                  ? "Five steps to a print"
                  : "Quy trình năm bước"}
              </h2>
            </div>
            <TextLink href={localHref(locale, "/video?dong=quy-trinh")}>
              {t.video}
            </TextLink>
          </div>
          <div className="process-grid">
            {steps.map((step, i) => (
              <article className="process-step" key={step}>
                <strong>0{i + 1}</strong>
                <h3>{step}</h3>
                <p>{descriptions[i]}</p>
                {i === 1 && (
                  <div className="swatches">
                    {["ink", "vermilion", "ochre", "indigo", "paper"].map(
                      (color) => (
                        <span
                          key={color}
                          className="swatch"
                          style={{ background: `var(--${color})` }}
                          role="img"
                          aria-label={
                            locale === "en"
                              ? `Colour sample: ${color}`
                              : `Mẫu màu: ${color}`
                          }
                        />
                      ),
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
          <p className="meta">
            {locale === "en"
              ? "Look at woodblocks and craft dioramas in the exhibition, then compare them with the finished prints."
              : "Quan sát ván khắc và mô hình công đoạn trong khu trưng bày, rồi đối chiếu với những bức tranh đã hoàn thiện."}
          </p>
          <ButtonLink href={localHref(locale, "/tham-quan-360")}>
            {locale === "en"
              ? "Enter the virtual tour"
              : "Bước vào chuyến tham quan ảo"}
          </ButtonLink>
        </section>
        <section>
          <h2>{locale === "en" ? "The painting genres" : "Các dòng tranh"}</h2>
          <div className="filters">
            {categories.map((c) => (
              <Link
                className="filter"
                key={c.id}
                href={localHref(locale, `/thu-vien-tranh?dong=${c.slug}`)}
              >
                {text(c, locale)}
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  }
  if (section === "hoi-dap" && !slug) {
    const items = await contents("FAQ");
    return (
      <div className="container section">
        <Intro locale={locale} title={t.faq} section={t.workshop} />
        <div className="prose-width">
          {items.map((item) => (
            <details className="accordion" key={item.id}>
              <summary>{text(item, locale)}</summary>
              <div lang={locale === "en" && !item.bodyEn ? "vi" : locale}>
                <Fallback item={item} locale={locale} />
                <Rich html={body(item, locale)} />
              </div>
            </details>
          ))}
        </div>
      </div>
    );
  }
  if (section === "tim-kiem" && !slug) {
    const search = get(query.q).slice(0, 100);
    const groups = await Promise.all(
      (["PAINTING", "VIDEO", "POST", "WORKSHOP"] as const).map(
        async (kind) => ({
          kind,
          items: (await contents(kind)).filter((c) =>
            fold(text(c, locale) + " " + summary(c, locale)).includes(
              fold(search),
            ),
          ),
        }),
      ),
    );
    return (
      <div className="container section">
        <Intro
          locale={locale}
          title={t.search}
          section={
            locale === "en" ? "THE VILLAGE ARCHIVE" : "TƯ LIỆU LÀNG TRANH"
          }
        />
        <form className="flex wrap" method="get">
          <label className="sr-only" htmlFor="search-query">
            {t.search}
          </label>
          <input
            id="search-query"
            className="input"
            name="q"
            defaultValue={search}
            maxLength={100}
            required
            placeholder={
              locale === "en"
                ? "A painting, a process, a workshop…"
                : "Tên tranh, quy trình, workshop…"
            }
          />
          <button className="button">{t.search}</button>
        </form>
        {!search ? (
          <Empty>
            {locale === "en"
              ? "Enter a keyword to search."
              : "Nhập từ khóa để tìm kiếm."}
          </Empty>
        ) : groups.every((g) => g.items.length === 0) ? (
          <Empty>{t.emptySearch}</Empty>
        ) : (
          groups
            .filter((g) => g.items.length)
            .map((group) => (
              <section className="section" key={group.kind}>
                <h2>
                  {group.kind === "PAINTING"
                    ? t.gallery
                    : group.kind === "VIDEO"
                      ? t.video
                      : group.kind === "POST"
                        ? t.posts
                        : t.workshop}{" "}
                  ({group.items.length})
                </h2>
                <div className="grid-3">
                  {group.items.slice(0, 12).map((item) => (
                    <ContentCard key={item.id} item={item} locale={locale} />
                  ))}
                </div>
              </section>
            ))
        )}
      </div>
    );
  }
  if (
    ["gioi-thieu", "tham-quan", "chinh-sach-bao-mat", "dieu-khoan"].includes(
      section,
    ) &&
    !slug
  ) {
    const item = await findContent("PAGE", section);
    if (!item) notFound();
    return (
      <div className="container section">
        <Intro
          locale={locale}
          title={text(item, locale)}
          section={locale === "en" ? "DONG HO VILLAGE" : "LÀNG ĐÔNG HỒ"}
        />
        <div className="details-layout">
          <div lang={locale === "en" && !item.bodyEn ? "vi" : locale}>
            <Fallback item={item} locale={locale} />
            <Rich html={body(item, locale)} />
            {section === "tham-quan" && (
              <>
                <h2>
                  {locale === "en"
                    ? "Before your visit"
                    : "Trước khi ghé xưởng"}
                </h2>
                <p>{locale === "en" ? settings.hoursEn : settings.hoursVi}</p>
                <p>
                  {locale === "en"
                    ? "From Hanoi, plan your route to Dong Ho village, then confirm the studio address directly."
                    : "Từ Hà Nội, tìm đường đến làng tranh Đông Hồ rồi xác nhận địa chỉ cơ sở qua liên hệ."}
                </p>
                <TextLink href={localHref(locale, "/lien-he?chu-de=group")}>
                  {t.contact}
                </TextLink>
              </>
            )}
          </div>
          {section === "tham-quan" ? (
            <iframe
              className="visit-map"
              loading="lazy"
              title={
                locale === "en"
                  ? "Dong Ho village map"
                  : "Bản đồ làng tranh Đông Hồ"
              }
              src={`https://www.google.com/maps?q=${encodeURIComponent(settings.mapQuery)}&output=embed`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="stack">
              {item.media && (
                <MediaView item={item} locale={locale} showSummary />
              )}
              <h3>
                {locale === "en" ? "Keep exploring" : "Tiếp tục khám phá"}
              </h3>
              <p>
                {locale === "en"
                  ? "Look around the exhibition or open a print to explore its details."
                  : "Nhìn quanh không gian trưng bày hoặc mở một bức tranh để khám phá từng chi tiết."}
              </p>
              <ButtonLink href={localHref(locale, "/tham-quan-360")}>
                {locale === "en"
                  ? "Visit in photographs"
                  : "Tham quan trong ảnh"}
              </ButtonLink>
              <ButtonLink href={localHref(locale, "/lien-he")}>
                {t.contact}
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    );
  }
  const kind = routeKinds[section];
  if (!kind) notFound();
  if (slug) {
    const item = await findContent(kind, slug);
    if (!item) {
      const old = await db.redirect.findUnique({
        where: { kind_oldSlug: { kind, oldSlug: slug } },
      });
      if (old && (await findContent(kind, old.newSlug)))
        permanentRedirect(localHref(locale, `/${section}/${old.newSlug}`));
      notFound();
    }
    const related = (await contents(kind))
      .filter((c) => c.id !== item.id)
      .slice(0, 3);
    const sessions = item.workshop
      ? await publicSessions(item.workshop.id)
      : [];
    const productPainting = item.product?.paintingId
      ? (await contents("PAINTING")).find(
          (p) => p.painting?.id === item.product?.paintingId,
        )
      : null;
    return (
      <div className="container section">
        <Intro
          locale={locale}
          title={text(item, locale)}
          description={summary(item, locale)}
          section={String(Reflect.get(t, listKey[section]))}
        />
        <Fallback item={item} locale={locale} />
        {kind === "VIDEO" ? (
          <div className="stack">
            <VideoPlayer
              source={item.video?.sourceUrl ?? ""}
              id={item.video?.id ?? ""}
              locale={locale}
            />
            <Rich html={body(item, locale)} />
            <Share locale={locale} />
          </div>
        ) : kind === "WORKSHOP" && item.workshop ? (
          <div className="details-layout">
            <div className="stack">
              <MediaView item={item} locale={locale} showSummary />
              <Rich html={body(item, locale)} />
              <dl className="details-list">
                <dt>{w.duration}</dt>
                <dd>
                  {item.workshop.durationMin}{" "}
                  {locale === "en" ? "minutes" : "phút"}
                </dd>
                <dt>{w.minAge}</dt>
                <dd>{item.workshop.minAge}+</dd>
                <dt>{w.price}</dt>
                <dd>
                  {w.adults}: {money(item.workshop.priceAdult, locale)}
                  <br />
                  {w.children}: {money(item.workshop.priceChild, locale)}
                </dd>
                <dt>{w.includes}</dt>
                <dd>
                  {locale === "en"
                    ? item.workshop.includesEn
                    : item.workshop.includesVi}
                </dd>
                <dt>{w.location}</dt>
                <dd>
                  {locale === "en"
                    ? item.workshop.locationEn
                    : item.workshop.locationVi}
                </dd>
              </dl>
              <p>
                {w.cancelPolicy.replace(
                  "{hours}",
                  String(settings.cancelHours),
                )}
              </p>
              <TextLink href={localHref(locale, "/lien-he?chu-de=group")}>
                {t.group}
              </TextLink>
            </div>
            <Booking
              sessions={sessions}
              locale={locale}
              selectedId={get(query.buoi)}
              priceAdult={item.workshop.priceAdult}
              priceChild={item.workshop.priceChild}
              bank={locale === "en" ? settings.bankEn : settings.bankVi}
              cancelHours={settings.cancelHours}
            />
          </div>
        ) : (
          <div className="details-layout">
            <div className="stack">
              <MediaView
                item={item}
                locale={locale}
                painting={kind === "PAINTING" || kind === "PRODUCT"}
                showSummary
              />
              {kind === "PAINTING" && item.media && (
                <Lightbox
                  src={mediaUrl(item.media)}
                  alt={text(item, locale)}
                  width={item.media.width ?? 300}
                  height={item.media.height ?? 400}
                  locale={locale}
                />
              )}
            </div>
            <div
              className="stack"
              lang={locale === "en" && !item.bodyEn ? "vi" : locale}
            >
              <Rich html={body(item, locale)} />
              {item.product && (
                <>
                  <dl className="details-list">
                    <dt>{locale === "en" ? "Size" : "Kích thước"}</dt>
                    <dd>
                      {locale === "en"
                        ? "Enquire about available sizes"
                        : "Liên hệ để chọn kích thước"}
                    </dd>
                    <dt>
                      {locale === "en" ? "Reference price" : "Giá tham khảo"}
                    </dt>
                    <dd>
                      {item.product.priceRef
                        ? money(item.product.priceRef, locale)
                        : locale === "en"
                          ? "Contact us for a quote"
                          : "Liên hệ để nhận báo giá"}
                    </dd>
                  </dl>
                  {productPainting && (
                    <ButtonLink
                      href={localHref(
                        locale,
                        `/lien-he?chu-de=painting&tranh=${productPainting.slug}`,
                      )}
                    >
                      {locale === "en"
                        ? "Enquire about this print"
                        : "Liên hệ đặt tranh này"}
                    </ButtonLink>
                  )}
                </>
              )}
              {item.painting && (
                <>
                  <dl className="details-list">
                    <dt>{locale === "en" ? "Material" : "Chất liệu"}</dt>
                    <dd>
                      {locale === "en"
                        ? item.painting.materialEn
                        : item.painting.materialVi}
                    </dd>
                    <dt>{locale === "en" ? "Dimensions" : "Kích thước"}</dt>
                    <dd>
                      {item.painting.widthCm && item.painting.heightCm
                        ? `${item.painting.widthCm} × ${item.painting.heightCm} cm`
                        : locale === "en"
                          ? "Enquire about available sizes"
                          : "Liên hệ để chọn kích thước"}
                    </dd>
                    {item.painting.inscription && (
                      <>
                        <dt>
                          {locale === "en" ? "Inscription" : "Chữ trên tranh"}
                        </dt>
                        <dd>
                          {item.painting.inscription}
                          <br />
                          {item.painting.transliteration}
                          <br />
                          {locale === "en"
                            ? item.painting.translationEn
                            : item.painting.translationVi}
                        </dd>
                      </>
                    )}
                  </dl>
                  <ButtonLink
                    href={localHref(
                      locale,
                      `/lien-he?chu-de=painting&tranh=${item.slug}`,
                    )}
                  >
                    {locale === "en"
                      ? "Enquire about this painting"
                      : "Liên hệ đặt tranh này"}
                  </ButtonLink>
                  <Share locale={locale} />
                </>
              )}
              {item.artisan && (
                <ContactForm locale={locale} artisanId={item.artisan.id} />
              )}
            </div>
          </div>
        )}
        {related.length > 0 && (
          <section className="section">
            <Wave />
            <h2>
              {locale === "en" ? "Related stories" : "Nội dung liên quan"}
            </h2>
            <div className="grid-3">
              {related.map((c) => (
                <ContentCard key={c.id} item={c} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }
  const items = await contents(kind);
  const category = get(query.dong);
  const color = get(query.mau);
  const q = get(query.q).slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number(get(query.page)) || 1));
  const filtered = items.filter(
    (c) =>
      (!category || c.category?.slug === category) &&
      (!color || c.painting?.color === color) &&
      (!q || fold(text(c, locale)).includes(fold(q))),
  );
  const categories = await db.category.findMany({
    where: { kind },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const title = String(Reflect.get(t, listKey[section]));
  if (kind === "WORKSHOP") {
    const sessions = await publicSessions();
    const calendar = get(query.view) === "calendar";
    const date = new Date();
    const fallbackMonth = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);
    const rawMonth = get(query.month);
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth)
      ? rawMonth
      : fallbackMonth;
    const [year, monthNumber] = month.split("-").map(Number);
    const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const startOffset =
      (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
    return (
      <div className="container section">
        <Intro
          locale={locale}
          title={
            locale === "en"
              ? "Print your own story"
              : "Tự tay in một câu chuyện"
          }
          description={
            locale === "en"
              ? "Choose a class and join the studio, without an account."
              : "Chọn một buổi học trong xưởng, không cần tạo tài khoản."
          }
          section={title}
        />
        <div className="flex spread wrap">
          <div className="filters">
            <Link
              className={`filter${!calendar ? " active" : ""}`}
              href={localHref(locale, "/workshop")}
            >
              {w.list}
            </Link>
            <Link
              className={`filter${calendar ? " active" : ""}`}
              href={localHref(locale, "/workshop?view=calendar")}
            >
              {w.month}
            </Link>
          </div>
          <TextLink href={localHref(locale, "/workshop/tra-cuu")}>
            {t.lookup}
          </TextLink>
        </div>
        {calendar ? (
          <>
            <form method="get" className="flex wrap">
              <input name="view" type="hidden" value="calendar" />
              <label htmlFor="month">{w.month}</label>
              <input
                id="month"
                type="month"
                name="month"
                defaultValue={month}
                className="input"
              />
              <button className="button">{t.confirm}</button>
            </form>
            <div className="calendar-grid section">
              {(locale === "en"
                ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
              ).map((d) => (
                <div className="calendar-cell" key={d}>
                  {d}
                </div>
              ))}
              {Array.from({ length: startOffset + dayCount }, (_, i) => {
                const day = i - startOffset + 1;
                return (
                  <div className="calendar-cell" key={i}>
                    {day > 0 && (
                      <>
                        <strong>{day}</strong>
                        {sessions
                          .filter(
                            (s) =>
                              new Intl.DateTimeFormat("en-CA", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                timeZone: "Asia/Ho_Chi_Minh",
                              }).format(new Date(s.startsAt)) ===
                              `${month}-${String(day).padStart(2, "0")}`,
                          )
                          .map((s) => (
                            <Link
                              href={localHref(
                                locale,
                                `/workshop/${s.slug}?buoi=${s.id}`,
                              )}
                              key={s.id}
                            >
                              {locale === "en" ? s.titleEn : s.titleVi} ·{" "}
                              {s.available}
                            </Link>
                          ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : sessions.length ? (
          <div className="grid-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} locale={locale} session={s} />
            ))}
          </div>
        ) : (
          <Empty>{t.noData}</Empty>
        )}
        <section className="section">
          <h2>
            {locale === "en"
              ? "About the classes"
              : "Các chương trình trải nghiệm"}
          </h2>
          <div className="grid-2">
            {items.map((c) => (
              <div className="panel" key={c.id}>
                <h3>{text(c, locale)}</h3>
                <p>{summary(c, locale)}</p>
                <TextLink href={contentHref(c, locale)}>{t.more}</TextLink>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="container section">
      <Intro
        locale={locale}
        title={title}
        description={
          kind === "PAINTING"
            ? locale === "en"
              ? "Themes, colours and the stories in each print."
              : "Những dòng tranh, sắc màu và câu chuyện trên từng bản in."
            : undefined
        }
        section={
          locale === "en" ? "THE DONG HO COLLECTION" : "BỘ SƯU TẬP ĐÔNG HỒ"
        }
      />
      {categories.length > 0 && (
        <nav
          className="filters"
          aria-label={locale === "en" ? "Category filter" : "Lọc danh mục"}
        >
          <Link
            className={`filter${!category ? " active" : ""}`}
            href={localHref(locale, base)}
          >
            {t.allCategories}
          </Link>
          {categories.map((c) => (
            <Link
              className={`filter${category === c.slug ? " active" : ""}`}
              href={localHref(locale, `${base}?dong=${c.slug}`)}
              key={c.id}
            >
              {text(c, locale)}
            </Link>
          ))}
        </nav>
      )}
      {kind === "PAINTING" && (
        <form className="grid-3" method="get">
          <input type="hidden" name="dong" value={category} />
          <div className="field">
            <label htmlFor="gallery-q">{t.search}</label>
            <input
              className="input"
              id="gallery-q"
              name="q"
              defaultValue={q}
              maxLength={100}
            />
          </div>
          <div className="field">
            <label htmlFor="gallery-color">
              {locale === "en" ? "Main colour" : "Màu chủ đạo"}
            </label>
            <select name="mau" id="gallery-color" defaultValue={color}>
              <option value="">{t.allCategories}</option>
              <option value="vermilion">
                {locale === "en" ? "Vermilion" : "Đỏ son"}
              </option>
              <option value="ink">{locale === "en" ? "Ink" : "Mực"}</option>
              <option value="ochre">
                {locale === "en" ? "Ochre" : "Vàng hòe"}
              </option>
              <option value="indigo">
                {locale === "en" ? "Indigo" : "Xanh chàm"}
              </option>
            </select>
          </div>
          <div className="field">
            <span className="field-label">
              {locale === "en" ? "Filter collection" : "Lọc thư viện"}
            </span>
            <button className="button">{t.search}</button>
          </div>
        </form>
      )}
      {kind === "VIDEO" && items[0]?.featured && !category && (
        <section className="section grid-2">
          <MediaView item={items[0]} locale={locale} />
          <div>
            <p className="eyebrow">
              {locale === "en" ? "PINNED VIDEO" : "VIDEO NỔI BẬT"}
            </p>
            <h2>{text(items[0], locale)}</h2>
            <p>{summary(items[0], locale)}</p>
            <ButtonLink href={contentHref(items[0], locale)}>
              {t.more}
            </ButtonLink>
          </div>
        </section>
      )}
      <div className="section grid-3">
        {filtered.slice((page - 1) * 6, page * 6).map((c) => (
          <div key={c.id}>
            <ContentCard item={c} locale={locale} />
            {c.product && (
              <div className="stack">
                <Badge>
                  {c.product.inStock
                    ? locale === "en"
                      ? "Available"
                      : "Có thể cung cấp"
                    : locale === "en"
                      ? "Enquire about availability"
                      : "Liên hệ kiểm tra tồn hàng"}
                </Badge>
                <p className="small">
                  {c.product.size}
                  <br />
                  {c.product.priceRef
                    ? money(c.product.priceRef, locale)
                    : locale === "en"
                      ? "Price on enquiry"
                      : "Giá chờ xác nhận"}
                </p>
                <ButtonLink
                  href={localHref(
                    locale,
                    `/lien-he?chu-de=painting&tranh=${c.slug}`,
                  )}
                >
                  {locale === "en" ? "Enquire" : "Liên hệ đặt mua"}
                </ButtonLink>
              </div>
            )}
            {c.artisan && <p>{summary(c, locale)}</p>}
          </div>
        ))}
      </div>
      {filtered.length === 0 && <Empty>{t.noData}</Empty>}
      {filtered.length > 6 && (
        <nav
          className="filters"
          aria-label={locale === "en" ? "Pagination" : "Phân trang"}
        >
          {Array.from({ length: Math.ceil(filtered.length / 6) }, (_, i) => (
            <Link
              className={`filter${page === i + 1 ? " active" : ""}`}
              key={i}
              href={localHref(
                locale,
                `${base}?${new URLSearchParams({ page: String(i + 1), dong: category, mau: color, q })}`,
              )}
              aria-current={page === i + 1 ? "page" : undefined}
            >
              {i + 1}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
