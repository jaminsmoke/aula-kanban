import type { JSONContent } from "@tiptap/core";
import { AULA_IMAGE_MIME_TYPES } from "../../../../../lib/domain/aula-documentos/image";
import {
  imageBase64ToBytes,
  imageBytesToBase64,
  type AulaImageAsset,
  type AulaImageAssetMap,
  type AulaImageDimensions,
  type AulaImageLoadResult,
  type AulaOfficeImage,
} from "../../../../../lib/domain/aula-documentos/image-assets";

const IMAGE_MIME_TYPES = new Set<string>(AULA_IMAGE_MIME_TYPES);
const FALLBACK_DIMENSIONS: AulaImageDimensions = { width: 1200, height: 900 };

/**
 * Recorre el contenido y devuelve las URLs internas de las imágenes.
 * @param content - Contenido Tiptap.
 * @returns URLs únicas en orden de aparición.
 */
export function collectAulaImageSources(content: JSONContent): string[] {
  const sources: string[] = [];
  const seen = new Set<string>();
  const visit = (node: JSONContent) => {
    if (node.type === "aulaImage") {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      if (src && !seen.has(src)) {
        seen.add(src);
        sources.push(src);
      }
    }
    for (const child of node.content ?? []) visit(child);
  };
  visit(content);
  return sources;
}

/**
 * Lee las dimensiones de PNG, JPEG, GIF o WebP sin cargar la imagen en el DOM.
 * @param bytes - Contenido del archivo.
 * @returns Dimensiones o `null` si el formato no se reconoce.
 */
export function readAulaImageDimensions(bytes: Uint8Array): AulaImageDimensions | null {
  if (bytes.length >= 24
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  const header = new TextDecoder().decode(bytes.subarray(0, 16));
  if (header.startsWith("GIF87a") || header.startsWith("GIF89a")) {
    return {
      width: bytes[6] | (bytes[7] << 8),
      height: bytes[8] | (bytes[9] << 8),
    };
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      if (marker === 0xda) break;
      const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (size < 2) break;
      const isStartOfFrame = (marker >= 0xc0 && marker <= 0xc3)
        || (marker >= 0xc5 && marker <= 0xc7)
        || (marker >= 0xc9 && marker <= 0xcb)
        || (marker >= 0xcd && marker <= 0xcf);
      if (isStartOfFrame) {
        return {
          width: (bytes[offset + 7] << 8) | bytes[offset + 8],
          height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        };
      }
      offset += size + 2;
    }
  }

  if (header.slice(0, 4) === "RIFF" && header.slice(8, 12) === "WEBP") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const chunk = header.slice(12, 16);
    if (chunk === "VP8X" && bytes.length >= 30) {
      return {
        width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
        height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
      };
    }
    if (chunk === "VP8L" && bytes.length >= 25) {
      const bits = view.getUint32(21, true);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    if (chunk === "VP8 " && bytes.length >= 30) {
      return {
        width: ((bytes[26] | (bytes[27] << 8)) & 0x3fff),
        height: ((bytes[28] | (bytes[29] << 8)) & 0x3fff),
      };
    }
  }

  return null;
}

/**
 * Lee un Blob como bytes con FileReader como respaldo de entornos antiguos.
 * @param blob - Blob de la respuesta.
 * @returns Bytes del archivo.
 */
async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen"));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Prepara una imagen compatible con DOCX/PPTX.
 * @param mime - MIME original.
 * @param bytes - Bytes originales.
 * @param dataUrl - URL de datos original.
 * @param dimensions - Dimensiones medidas.
 * @returns La imagen preparada o `undefined` si hay que convertirla.
 */
function directOfficeImage(
  mime: string,
  bytes: Uint8Array,
  dataUrl: string,
  dimensions: AulaImageDimensions,
): AulaOfficeImage | undefined {
  if (mime !== "image/png" && mime !== "image/jpeg" && mime !== "image/gif") return undefined;
  return {
    mime,
    bytes,
    base64: imageBytesToBase64(bytes),
    dataUrl,
    ...dimensions,
  };
}

/**
 * Convierte una imagen WebP en PNG para los formatos Office que no la admiten.
 * @param dataUrl - Imagen WebP como URL de datos.
 * @returns La imagen PNG o `undefined` si el navegador no puede convertirla.
 */
async function convertWebpToPng(dataUrl: string): Promise<AulaOfficeImage | undefined> {
  if (typeof document === "undefined" || typeof Image === "undefined") return undefined;
  const image = new Image();
  const loaded = await new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = dataUrl;
  });
  if (!loaded || !image.naturalWidth || !image.naturalHeight) return undefined;

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.drawImage(image, 0, 0);
  const png = canvas.toDataURL("image/png");
  const base64 = png.split(",", 2)[1];
  if (!base64) return undefined;
  return {
    mime: "image/png",
    bytes: imageBase64ToBytes(base64),
    base64,
    dataUrl: png,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

/**
 * Descarga las imágenes internas y las convierte en recursos embebibles.
 * @param content - Contenido del documento.
 * @param options - Implementación de `fetch` para pruebas o entornos alternativos.
 * @returns Imágenes resueltas, URLs de datos y fallos.
 */
export async function loadAulaImageAssets(
  content: JSONContent,
  options: { fetcher?: typeof fetch } = {},
): Promise<AulaImageLoadResult> {
  const assets = new Map<string, AulaImageAsset>();
  const sources = new Map<string, string>();
  const failed: string[] = [];
  const warnings: string[] = [];
  const fetcher = options.fetcher ?? globalThis.fetch;

  for (const source of collectAulaImageSources(content)) {
    try {
      if (!fetcher) throw new Error("fetch no disponible");
      const response = await fetcher(source, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const mime = (blob.type || response.headers.get("content-type") || "")
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
      if (!IMAGE_MIME_TYPES.has(mime) || !blob.size) throw new Error("imagen no válida");
      const bytes = await blobToBytes(blob);
      const measured = readAulaImageDimensions(bytes);
      const dimensions = measured && measured.width > 0 && measured.height > 0
        ? measured
        : FALLBACK_DIMENSIONS;
      const base64 = imageBytesToBase64(bytes);
      const dataUrl = `data:${mime};base64,${base64}`;
      const asset: AulaImageAsset = {
        source,
        mime,
        bytes,
        base64,
        dataUrl,
        ...dimensions,
      };
      asset.office = mime === "image/webp"
        ? await convertWebpToPng(dataUrl)
        : directOfficeImage(mime, bytes, dataUrl, dimensions);
      if (mime === "image/webp" && !asset.office) {
        warnings.push("Una imagen WebP no se pudo convertir para DOCX/PPTX.");
      }
      assets.set(source, asset);
      sources.set(source, dataUrl);
    } catch {
      failed.push(source);
      warnings.push("No se pudo incluir una imagen; revisa que siga disponible.");
    }
  }

  return { assets, sources, failed, warnings };
}
