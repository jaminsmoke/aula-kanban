import { describe, expect, it } from "vitest";
import { buildNotesHtml } from "./documentos-export";
import { parseNotesDocument } from "./documentos-model";

describe("exportación HTML de Notas y documentos", () => {
  it("genera un archivo autónomo con título, formato y enlaces seguros", () => {
    const document = parseNotesDocument({
      title: "Notas <script>alert(1)</script>",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Texto <b>sin HTML crudo</b>." }],
          },
          {
            type: "paragraph",
            content: [{
              type: "text",
              text: "Fuente",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            }],
          },
        ],
      },
    });

    expect(document).not.toBeNull();
    const html = buildNotesHtml(document!);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;sin HTML crudo&lt;/b&gt;");
    expect(html).toContain('href="https://example.com/"');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("src=");
    expect(html).not.toContain("javascript:");
  });
});
