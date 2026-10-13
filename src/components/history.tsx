"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Seal } from "./ui";
export function Timeline({
  items,
  locale,
}: {
  items: Array<{
    id: string;
    title: string;
    era: string;
    description: ReactNode;
  }>;
  locale: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () =>
      setEdges({
        start: element.scrollLeft <= 1,
        end:
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
      });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [items.length]);
  function scroll(direction: number) {
    const element = ref.current;
    if (!element) return;
    const card = element.querySelector<HTMLElement>(".milestone");
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
    element.scrollBy({
      left: direction * ((card?.offsetWidth ?? element.clientWidth) + gap),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <div className="stack">
      <div className="timeline-controls flex">
        <button
          className="icon-button"
          aria-label={locale === "en" ? "Previous milestones" : "Mốc trước"}
          disabled={edges.start}
          title={
            edges.start
              ? locale === "en"
                ? "First milestone"
                : "Đang ở mốc đầu"
              : undefined
          }
          onClick={() => scroll(-1)}
        >
          <ArrowLeft />
        </button>
        <button
          className="icon-button"
          aria-label={locale === "en" ? "Next milestones" : "Mốc tiếp"}
          disabled={edges.end}
          title={
            edges.end
              ? locale === "en"
                ? "Last milestone"
                : "Đang ở mốc cuối"
              : undefined
          }
          onClick={() => scroll(1)}
        >
          <ArrowRight />
        </button>
      </div>
      <div
        className="timeline"
        ref={ref}
        role="region"
        aria-label={locale === "en" ? "Chronology" : "Dòng thời gian"}
        tabIndex={0}
      >
        {items.map((item, i) => (
          <article
            className="milestone"
            key={item.id}
            aria-label={`${locale === "en" ? "Milestone" : "Mốc"} ${i + 1}: ${item.title}`}
          >
            <Seal>{romanIndex(i + 1)}</Seal>
            <p className="eyebrow">{item.era}</p>
            <h3>{item.title}</h3>
            <details className="accordion">
              <summary>
                {locale === "en" ? "Read this milestone" : "Đọc chi tiết mốc"}
              </summary>
              <div>{item.description}</div>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}

function romanIndex(number: number) {
  const numerals: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let output = "";
  for (const [value, label] of numerals)
    while (number >= value) {
      output += label;
      number -= value;
    }
  return output;
}
