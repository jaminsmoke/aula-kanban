// @vitest-environment node

import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { AulaDocument } from "./document";
import {
  AULA_COPY_DOCUMENT_FILE,
  AULA_COPY_MANIFEST_FILE,
  AULA_COPY_FORMAT_VERSION,
  buildAulaDocumentCopy,
  readAulaDocumentCopy,
  inspectAulaDocumentCopy,
  type AulaCopyAsset,
} from "./copy";

const IMAGE_ID = "00000000-0000-4000-8000-000000000001";
const IMAGE_SRC = `/api/files/${IMAGE_ID}`;
const TINY_PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nTQAAAAASUVORK5CYII="),
  (char) => char.charCodeAt(0),
);

/**
 * Crea un documento con una imagen.
 * @returns Documento de prueba.
 */
function documentWithImage(): AulaDocument {
  return {
    schemaVersion: 3,
    title: "Copia de clase",
    presentation: { theme: "claro", notes: { "0": "Nota" } },
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Introducción" }] },
        {
          type: "aulaImage",
          attrs: { src: IMAGE_SRC, alt: "Foto", caption: "Pie", width: 80, alignment: "center" },
        },
      ],
    },
  };
}

/**
 * Crea el asset correspondiente a la imagen de prueba.
 * @returns Asset de imagen.
 */
function imageAsset(): AulaCopyAsset {
  return { id: IMAGE_ID, mime: "image/png", bytes: TINY_PNG };
}

/**
 * Construye una copia válida.
 * @returns Bytes de la copia.
 */
async function validCopy(): Promise<Uint8Array> {
  const result = await buildAulaDocumentCopy(documentWithImage(), [imageAsset()], {
    createdAt: "2026-11-20T10:00:00.000Z",
  });
  if (!result.ok) throw new Error(result.message);
  return result.bytes;
}

/**
 * Reescribe el manifiesto de una copia.
 * @param bytes - Copia original.
 * @param change - Cambio aplicado al manifiesto.
 * @returns Nueva copia.
 */
function rewriteManifest(bytes: Uint8Array, change: (manifest: Record<string, unknown>) => void): Uint8Array {
  const files = unzipSync(bytes);
  const manifest = JSON.parse(new TextDecoder().decode(files[AULA_COPY_MANIFEST_FILE])) as Record<string, unknown>;
  change(manifest);
  files[AULA_COPY_MANIFEST_FILE] = new TextEncoder().encode(JSON.stringify(manifest));
  return zipSync(files, { level: 6 });
}

describe("copias portables de Aula Documentos", () => {
  it("construye y vuelve a leer una copia con imágenes y presentación", async () => {
    const bytes = await validCopy();
    const result = await readAulaDocumentCopy(bytes);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe("Copia de clase");
    expect(result.document.presentation).toEqual({ theme: "claro", notes: { "0": "Nota" } });
    expect(result.manifest).toMatchObject({
      app: "aula-documentos",
      formatVersion: AULA_COPY_FORMAT_VERSION,
      schemaVersion: 3,
      createdAt: "2026-11-20T10:00:00.000Z",
    });
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toMatchObject({ id: IMAGE_ID, mime: "image/png" });
    expect(result.assets[0].bytes).toEqual(TINY_PNG);
  });

  it("inspecciona una copia sin descomprimir sus imágenes para la API", async () => {
    const result = await inspectAulaDocumentCopy(await validCopy());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe("Copia de clase");
    expect(result.manifest.assets).toHaveLength(1);
  });

  it("exige que todas las imágenes del documento estén en la copia", async () => {
    const result = await buildAulaDocumentCopy(documentWithImage(), []);
    expect(result).toMatchObject({ ok: false, code: "missing-asset" });
  });

  it("rechaza imágenes que el documento no usa", async () => {
    const result = await buildAulaDocumentCopy(
      { schemaVersion: 3, title: "Sin imágenes", content: { type: "doc", content: [] } },
      [imageAsset()],
    );
    expect(result).toMatchObject({ ok: false, code: "unused-asset" });
  });

  it("rechaza un ZIP que no es válido", async () => {
    const result = await readAulaDocumentCopy(new Uint8Array([1, 2, 3]));
    expect(result).toMatchObject({ ok: false, code: "invalid-zip" });
  });

  it("rechaza rutas no permitidas antes de leer el manifiesto", async () => {
    const bytes = zipSync({
      "../evil.txt": new TextEncoder().encode("no"),
    });
    const result = await readAulaDocumentCopy(bytes);
    expect(result).toMatchObject({ ok: false, code: "unsafe-path" });
  });

  it("rechaza un asset descomprimido demasiado grande", async () => {
    const bytes = zipSync({
      [`assets/${IMAGE_ID}.png`]: new Uint8Array(6 * 1024 * 1024),
    }, { level: 0 });
    const result = await readAulaDocumentCopy(bytes);
    expect(result).toMatchObject({ ok: false, code: "too-large" });
  });

  it("rechaza un formato de copia futuro", async () => {
    const bytes = rewriteManifest(await validCopy(), (manifest) => {
      manifest.formatVersion = AULA_COPY_FORMAT_VERSION + 1;
    });
    const result = await readAulaDocumentCopy(bytes);
    expect(result).toMatchObject({ ok: false, code: "unsupported-version" });
  });

  it("rechaza un documento de copia con esquema futuro", async () => {
    const bytes = rewriteManifest(await validCopy(), (manifest) => {
      manifest.schemaVersion = 99;
    });
    const result = await readAulaDocumentCopy(bytes);
    expect(result).toMatchObject({ ok: false, code: "unsupported-version" });
  });

  it("rechaza un asset alterado por el hash", async () => {
    const original = await validCopy();
    const files = unzipSync(original);
    const key = `assets/${IMAGE_ID}.png`;
    const altered = TINY_PNG.slice();
    altered[altered.length - 1] ^= 0xff;
    files[key] = altered;
    const result = await readAulaDocumentCopy(zipSync(files, { level: 6 }));
    expect(result).toMatchObject({ ok: false, code: "hash-mismatch" });
  });

  it("rechaza un manifiesto sin el documento", async () => {
    const files = unzipSync(await validCopy());
    delete files[AULA_COPY_DOCUMENT_FILE];
    const result = await readAulaDocumentCopy(zipSync(files, { level: 6 }));
    expect(result).toMatchObject({ ok: false, code: "invalid-manifest" });
  });
});
