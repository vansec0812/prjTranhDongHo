import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentInclude, text, summary, body } from "@/lib/content";
import { MediaView } from "@/components/content-card";
import { RichText } from "@/components/rich-text";
import { VideoPlayer } from "@/components/video-player";
import { videoEmbed } from "@/lib/domain";
import { Alert, ButtonLink } from "@/components/ui";
export default async function Preview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const locale = (await searchParams).locale === "en" ? "en" : "vi";
  const item = await db.content.findUnique({
    where: { id },
    include: contentInclude,
  });
  if (!item) notFound();
  return (
    <article className="stack">
      <Alert>
        Xem trước bản đã lưu · Chỉ admin đăng nhập xem được. Nội dung nháp chưa
        được xuất bản.
      </Alert>
      <div className="flex wrap">
        <ButtonLink href={`/admin/preview/${id}?locale=vi`} secondary>
          Tiếng Việt
        </ButtonLink>
        <ButtonLink href={`/admin/preview/${id}?locale=en`} secondary>
          English
        </ButtonLink>
      </div>
      <h1 lang={locale === "en" && !item.titleEn ? "vi" : locale}>
        {text(item, locale)}
      </h1>
      <p lang={locale === "en" && !item.summaryEn ? "vi" : locale}>
        {summary(item, locale)}
      </p>
      {locale === "en" && (!item.titleEn || !item.bodyEn) && (
        <Alert>Nội dung thiếu bản EN được hiển thị bằng tiếng Việt.</Alert>
      )}
      <div className="prose-width">
        <MediaView
          item={item}
          locale={locale}
          painting={item.kind === "PAINTING"}
        />
      </div>
      {item.video && videoEmbed(item.video.sourceUrl) && (
        <VideoPlayer
          id={item.video.id}
          locale={locale}
          source={item.video.sourceUrl}
        />
      )}
      <div lang={locale === "en" && !item.bodyEn ? "vi" : locale}>
        <RichText html={body(item, locale)} />
      </div>
    </article>
  );
}
