import { describe, expect, it } from "vitest";
import {
  aulaImageUploadId,
  collectAulaImageUploadIds,
  normalizeAulaImageAttrs,
  normalizeAulaImageSrc,
} from "./image";

const src = "/api/files/123e4567-e89b-42d3-a456-426614174000";

describe("imágenes de Aula Documentos", () => {
  it("acepta solo rutas internas de archivos", () => {
    expect(normalizeAulaImageSrc(src)).toBe(src);
    expect(normalizeAulaImageSrc("https://example.com/foto.png")).toBeNull();
    expect(normalizeAulaImageSrc("data:image/png;base64,AAAA")).toBeNull();
    expect(normalizeAulaImageSrc("javascript:alert(1)")).toBeNull();
    expect(aulaImageUploadId(src)).toBe("123e4567-e89b-42d3-a456-426614174000");
  });

  it("normaliza texto, tamaño y alineación", () => {
    expect(normalizeAulaImageAttrs({
      src,
      alt: "  Esquema ",
      caption: "  Pie ",
      width: 125,
      alignment: "izquierda",
    })).toEqual({
      ok: true,
      attrs: { src, alt: "Esquema", caption: "Pie", width: 100, alignment: "center" },
    });
  });

  it("recoge ids de subida de un árbol anidado", () => {
    const other = "/api/files/550e8400-e29b-41d4-a716-446655440000";
    const ids = collectAulaImageUploadIds({
      type: "doc",
      content: [
        { type: "aulaImage", attrs: { src } },
        { type: "blockquote", content: [{ type: "aulaImage", attrs: { src: other } }] },
        { type: "aulaImage", attrs: { src: "https://example.com/fuera.png" } },
      ],
    });
    expect([...ids]).toEqual([
      "123e4567-e89b-42d3-a456-426614174000",
      "550e8400-e29b-41d4-a716-446655440000",
    ]);
  });
});
