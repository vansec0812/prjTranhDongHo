"use client";
import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Seal } from "./ui";
export function Timeline({
  items,
  locale,
}: {
  items: Array<{ id: string; title: string; era: string; description: string }>;
  locale: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="stack">
      <div className="flex spread">
        <p className="meta">
          {locale === "en"
            ? "Illustrative chronology from SRS, pending verification"
            : "Mốc minh họa từ SRS, chờ đối chiếu tư liệu cơ sở"}
        </p>
        <div className="flex">
          <button
            className="icon-button"
            aria-label={locale === "en" ? "Previous milestones" : "Mốc trước"}
            onClick={() =>
              ref.current?.scrollBy({
                left: -360,
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              })
            }
          >
            <ArrowLeft />
          </button>
          <button
            className="icon-button"
            aria-label={locale === "en" ? "Next milestones" : "Mốc tiếp"}
            onClick={() =>
              ref.current?.scrollBy({
                left: 360,
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              })
            }
          >
            <ArrowRight />
          </button>
        </div>
      </div>
      <div
        className="timeline"
        ref={ref}
        role="region"
        aria-label={locale === "en" ? "Chronology" : "Dòng thời gian"}
        tabIndex={0}
      >
        {items.map((item, i) => (
          <article className="milestone" key={item.id}>
            <Seal>{["I", "II", "III", "IV", "V"][i] ?? i + 1}</Seal>
            <p className="eyebrow">{item.era}</p>
            <h3>{item.title}</h3>
            <details className="accordion">
              <summary>
                {locale === "en" ? "Read this milestone" : "Đọc chi tiết mốc"}
              </summary>
              <p>{item.description}</p>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
