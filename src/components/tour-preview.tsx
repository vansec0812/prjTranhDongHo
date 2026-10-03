import Image from "next/image";
import Link from "next/link";
import { MoveUpRight, Compass } from "lucide-react";
import { localHref, type Locale } from "@/lib/links";
import { tour } from "@/lib/tour";
import { ButtonLink } from "./ui";
export function TourPreview({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return (
    <section className="section section-alt">
      <div className="container tour-preview">
        <Link
          className="tour-preview-photo"
          href={localHref(locale, "/tham-quan-360")}
        >
          <Image
            src="/images/visit/cho-tranh.webp"
            alt={
              en
                ? "A painting-market diorama in the exhibition"
                : "Mô hình chợ tranh trong gian trưng bày"
            }
            width={1600}
            height={1067}
            sizes="(max-width:767px) 100vw, 55vw"
          />
          <span className="tour-preview-seal">
            <Compass size={24} />
            360°
            <MoveUpRight size={18} />
          </span>
          <span className="image-summary">
            {tour.intro[locale]}
            <span className="summary-action">
              {en ? "Enter the tour" : "Bước vào chuyến tham quan"} →
            </span>
          </span>
        </Link>
        <div>
          <p className="eyebrow">
            {en ? "A VISIT FROM WHERE YOU ARE" : "GHÉ THĂM, TỪ NƠI BẠN ĐANG Ở"}
          </p>
          <h2>
            {en ? (
              <>
                A turn of the view,
                <br />
                <em>a world of stories.</em>
              </>
            ) : (
              <>
                Đi một vòng,
                <br />
                <em>gặp Đông Hồ.</em>
              </>
            )}
          </h2>
          <p>{tour.intro[locale]}</p>
          <p className="meta">
            {en
              ? "4 viewpoints · Prints, materials and woodblocks"
              : "4 góc nhìn · Tranh, vật liệu và ván khắc"}
          </p>
          <ButtonLink href={localHref(locale, "/tham-quan-360")}>
            {en ? "Begin your visit" : "Bắt đầu tham quan"}
            <MoveUpRight size={18} />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
