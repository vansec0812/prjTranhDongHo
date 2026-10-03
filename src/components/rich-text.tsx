import sanitizeHtml from "sanitize-html";
export function RichText({ html }: { html: string }) {
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
