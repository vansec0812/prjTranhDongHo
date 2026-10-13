import sanitizeHtml from "sanitize-html";
import { keepCompoundWords } from "./typography";

export function renderRichText(html: string) {
  return sanitizeHtml(html, {
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
    textFilter: keepCompoundWords,
  });
}
