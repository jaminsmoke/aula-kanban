import {
  AULA_DOCUMENT_JSON_MAX_LENGTH,
  AULA_DOCUMENT_SCHEMA_VERSION,
  parseAulaDocument,
  type AulaDocument,
} from "./document";
import type { AulaDocumentImportResult } from "./importers";
import { isAulaMarkdownTooLong } from "./markdown";

const TEXT_WARNING = "El texto se importa como párrafos; no se interpreta formato.";

/**
 * Convierte texto plano en párrafos literales, sin interpretar Markdown.
 * @param source - Contenido del archivo o texto pegado.
 * @param titleFallback - Título cuando el nombre no permite deducirlo.
 * @returns La vista previa validada o un error legible.
 */
export function importPlainTextDocument(source: string, titleFallback = "Texto importado"): AulaDocumentImportResult {
  if (isAulaMarkdownTooLong(source)) {
    return { ok: false, message: "El texto supera el tamaño permitido." };
  }
  const lines = source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim().length > 0);
  if (!lines.length) return { ok: false, message: "El texto está vacío." };

  const title = titleFallback.trim().slice(0, 120) || "Texto importado";
  const document: AulaDocument = {
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title,
    content: {
      type: "doc",
      content: lines.map((line) => ({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      })),
    },
  };
  const parsed = parseAulaDocument(document);
  if (!parsed.ok) return { ok: false, message: `No se pudo importar el texto: ${parsed.message}` };
  return {
    ok: true,
    preview: {
      source: "text",
      document: parsed.document,
      stats: parsed.stats,
      warnings: [TEXT_WARNING],
    },
  };
}

/**
 * Valida un JSON como documento canónico de Aula.
 * @param source - Contenido del archivo JSON.
 * @returns La vista previa validada o un error legible.
 */
export function importJsonDocument(source: string): AulaDocumentImportResult {
  if (!source.trim()) return { ok: false, message: "El JSON está vacío." };
  if (source.length > AULA_DOCUMENT_JSON_MAX_LENGTH) {
    return { ok: false, message: "El JSON supera el tamaño permitido." };
  }

  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return { ok: false, message: "El archivo no contiene JSON válido." };
  }

  const parsed = parseAulaDocument(value);
  if (!parsed.ok) return { ok: false, message: `No se pudo importar el JSON: ${parsed.message}` };
  return {
    ok: true,
    preview: {
      source: "json",
      document: parsed.document,
      stats: parsed.stats,
      warnings: [],
    },
  };
}
