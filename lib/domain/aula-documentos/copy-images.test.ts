import { describe, expect, it } from "vitest";
import { remapCopyImageUrls } from "./copy-image-urls";
import type { AulaDocument } from "./document";

describe("remapeo de imágenes de copias", () => {
  it("sustituye las URLs antiguas sin mutar el documento original", () => {
    const oldId = "00000000-0000-4000-8000-000000000001";
    const document = {
      schemaVersion: 3,
      title: "Copia",
      content: {
        type: "doc",
        content: [{ type: "aulaImage", attrs: { src: `/api/files/${oldId}`, alt: "Foto" } }],
      },
    } as AulaDocument;

    const result = remapCopyImageUrls(document, new Map([[oldId, "/api/files/new"]]));

    expect(result.content.content?.[0]?.attrs?.src).toBe("/api/files/new");
    expect(document.content.content?.[0]?.attrs?.src).toBe(`/api/files/${oldId}`);
  });
});
