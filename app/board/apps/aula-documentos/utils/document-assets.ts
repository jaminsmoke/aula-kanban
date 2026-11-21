import type { JSONContent } from "@tiptap/core";
import type {
  AulaCopyAsset,
  AulaCopyBuildResult,
} from "../../../../../lib/domain/aula-documentos/copy";
import type { AulaDocument } from "../../../../../lib/domain/aula-documentos/document";

/**
 * Carga las imágenes internas solo cuando se inicia una exportación.
 * @param content - Contenido del documento.
 * @returns Imágenes resueltas y fallos.
 */
export async function loadExportImages(content: JSONContent) {
  const { loadAulaImageAssets } = await import("../exportacion/export-images");
  return loadAulaImageAssets(content);
}

/**
 * Construye una copia portable con las imágenes del documento.
 * @param document - Documento que se quiere archivar.
 * @returns El ZIP y el manifiesto, o un error legible.
 */
export async function buildPortableCopy(document: AulaDocument): Promise<AulaCopyBuildResult> {
  const images = await loadExportImages(document.content);
  if (images.failed.length) {
    return {
      ok: false,
      code: "missing-asset",
      message: "No se pudo leer una imagen del documento. La copia no se ha generado.",
    };
  }
  const { buildAulaDocumentCopy } = await import("../../../../../lib/domain/aula-documentos/copy");
  return buildAulaDocumentCopy(
    document,
    [...images.assets.values()].map(({ source, mime, bytes }) => ({
      id: source.split("/").pop() ?? "",
      mime: mime as AulaCopyAsset["mime"],
      bytes,
    })),
  );
}
