import { describe, expect, it } from "vitest";
import { keepCompoundWords } from "../../src/lib/typography";
import { renderRichText } from "../../src/lib/rich-text";

describe("UI-05 Vietnamese compound line breaks", () => {
  it("keeps cultural terms together while leaving breaks between terms", () => {
    expect(keepCompoundWords("Di sản văn hóa phi vật thể quốc gia")).toBe(
      "Di\u00a0sản văn\u00a0hóa phi\u00a0vật\u00a0thể quốc\u00a0gia",
    );
    expect(keepCompoundWords("THỰC TẾ ẢO tại Đông Hồ")).toBe(
      "THỰC\u00a0TẾ\u00a0ẢO tại Đông\u00a0Hồ",
    );
    expect(keepCompoundWords("quốc\u00a0gia và quốc gia")).toBe(
      "quốc\u00a0gia và quốc\u00a0gia",
    );
  });
  it("does not merge adjacent words or change English prose and URLs", () => {
    expect(keepCompoundWords("quốc giang")).toBe("quốc giang");
    expect(keepCompoundWords("A workshop in the national inventory")).toBe(
      "A workshop in the national inventory",
    );
  });
  it("formats sanitized rich text without changing link attributes or enabling scripts", () => {
    const html =
      '<p>Di sản quốc gia <a href="https://example.invalid/quoc-gia" onclick="alert(1)">Bảo tàng</a></p><script>alert(2)</script>';
    const output = renderRichText(html);
    expect(output).toContain("quốc\u00a0gia");
    expect(output).toContain('href="https://example.invalid/quoc-gia"');
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("<script");
    expect(html).toContain("quốc gia");
  });
});
