// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  collectAulaImageSources,
  imageBase64ToBytes,
  imageBytesToBase64,
  loadAulaImageAssets,
  readAulaImageDimensions,
} from "./export-images";

const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nTQAAAAASUVORK5CYII=";
const TINY_PNG = imageBase64ToBytes(TINY_PNG_BASE64);

/**
 * Construye un documento con imágenes.
 * @returns Contenido Tiptap de prueba.
 */
function contentWithImages() {
  return {
    type: "doc",
    content: [
      { type: "aulaImage", attrs: { src: "/api/files/uno", alt: "Uno", caption: "Pie", width: 80, alignment: "center" } },
      { type: "paragraph", content: [{ type: "text", text: "Texto" }] },
      { type: "aulaImage", attrs: { src: "/api/files/uno", alt: "Repetida" } },
      { type: "aulaImage", attrs: { src: "/api/files/dos", alt: "Dos" } },
    ],
  };
}

describe("resolución de imágenes para exportar", () => {
  it("recoge URLs internas una sola vez", () => {
    expect(collectAulaImageSources(contentWithImages())).toEqual([
      "/api/files/uno",
      "/api/files/dos",
    ]);
  });

  it("codifica y decodifica bytes sin romper imágenes", () => {
    expect(imageBytesToBase64(TINY_PNG)).toBe(TINY_PNG_BASE64);
    expect(imageBase64ToBytes(TINY_PNG_BASE64)).toEqual(TINY_PNG);
  });

  it("lee las dimensiones de un PNG", () => {
    expect(readAulaImageDimensions(TINY_PNG)).toEqual({ width: 1, height: 1 });
  });

  it("descarga las imágenes y prepara datos para HTML y Office", async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request) => {
      return new Response(new Blob([TINY_PNG.slice().buffer as ArrayBuffer], { type: "image/png" }), { status: 200 });
    });

    const result = await loadAulaImageAssets(contentWithImages(), { fetcher });
    expect(result.failed).toEqual([]);
    expect(result.sources.get("/api/files/uno")).toMatch(/^data:image\/png;base64,/);
    const asset = result.assets.get("/api/files/uno");
    expect(asset).toMatchObject({ mime: "image/png", width: 1, height: 1 });
    expect(asset?.office?.mime).toBe("image/png");
    expect(asset?.office?.bytes).toEqual(TINY_PNG);
  });

  it("marca los recursos que ya no están disponibles", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith("dos")) return new Response("no", { status: 404 });
      return new Response(new Blob([TINY_PNG.slice().buffer as ArrayBuffer], { type: "image/png" }));
    });

    const result = await loadAulaImageAssets(contentWithImages(), { fetcher });
    expect(result.failed).toEqual(["/api/files/dos"]);
    expect(result.assets.has("/api/files/uno")).toBe(true);
    expect(result.warnings.join(" ")).toContain("No se pudo incluir una imagen");
  });

  it("rechaza un MIME no permitido", async () => {
    const fetcher = vi.fn(async () => new Response(new Blob(["svg"], { type: "image/svg+xml" })));
    const result = await loadAulaImageAssets(contentWithImages(), { fetcher });
    expect(result.failed).toHaveLength(2);
  });
});
