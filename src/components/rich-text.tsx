import { renderRichText } from "@/lib/rich-text";
export function RichText({ html }: { html: string }) {
  return (
    <div
      className="rich-text"
      dangerouslySetInnerHTML={{
        __html: renderRichText(html),
      }}
    />
  );
}
