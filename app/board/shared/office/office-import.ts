import { officeMarkdownToPreview, type OfficeDocumentImportResult } from "../../../../lib/domain/aula-documentos/office-import";
import { officeErrorMessage, validateOfficeFile } from "./office-model";

/**
 * Detecta un proyecto VBA dentro de un paquete OOXML.
 * @param bytes - Bytes del archivo.
 * @returns `true` si contiene `vbaProject.bin`.
 */
export function hasVbaProject(bytes: Uint8Array): boolean {
  const marker = "vbaProject.bin";
  const codePoints = Array.from(marker, (character) => character.charCodeAt(0));
  for (let index = 0; index <= bytes.length - codePoints.length; index += 1) {
    if (codePoints.every((code, offset) => bytes[index + offset] === code)) return true;
  }
  return false;
}

/**
 * Lee un DOCX/PPTX local y prepara la vista previa para Aula Documentos.
 * @param file - Archivo elegido por la persona.
 * @returns La vista previa o un error legible.
 */
export async function importOfficeFile(file: File): Promise<OfficeDocumentImportResult> {
  const validation = validateOfficeFile(file);
  if ("error" in validation) return { ok: false, message: validation.error };
  if (validation.file.format === "xlsx") {
    return {
      ok: false,
      message: "XLSX se consulta en Visor Office. Aula Documentos importa DOCX y PPTX; las hojas de cálculo se tratarán en su propio bloque.",
    };
  }

  try {
    const bytes = await file.arrayBuffer();
    if (hasVbaProject(new Uint8Array(bytes))) {
      return {
        ok: false,
        message: "El archivo contiene macros. Aula Documentos no ejecuta macros; guárdalo como DOCX/PPTX sin macros antes de importarlo.",
      };
    }
    let markdown = "";
    if (validation.file.format === "docx") {
      const { DocxDocument } = await import("@silurus/ooxml/docx");
      const document = await DocxDocument.load(bytes);
      try {
        markdown = await document.toMarkdown();
      } finally {
        document.destroy();
      }
    } else {
      const { PptxPresentation } = await import("@silurus/ooxml/pptx");
      const presentation = await PptxPresentation.load(bytes);
      try {
        markdown = await presentation.toMarkdown();
      } finally {
        presentation.destroy();
      }
    }

    return officeMarkdownToPreview({
      markdown,
      format: validation.file.format,
      fileName: validation.file.name,
    });
  } catch (error) {
    return { ok: false, message: officeErrorMessage(error) };
  }
}
