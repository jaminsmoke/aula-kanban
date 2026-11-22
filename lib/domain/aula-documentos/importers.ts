import {
  AULA_DOCUMENT_MAX_MERMAID_CODE_LENGTH,
  AULA_DOCUMENT_SCHEMA_VERSION,
  parseAulaDocument,
  type AulaDocument,
  type AulaDocumentStats,
} from "./document";
import { isAulaMarkdownTooLong, markdownToDocument } from "./markdown";
import { stripDuplicateTitleHeading } from "./title-heading";

/** Apps antiguas con datos que se pueden previsualizar en Aula Documentos. */
export type AulaDocumentImportSource = "documentos" | "mermaid" | "presentaciones";

/** Vista previa de una importación, sin escribir nada en el origen. */
export type AulaDocumentImportPreview = {
  source: AulaDocumentImportSource | "markdown" | "office" | "text" | "json";
  document: AulaDocument;
  stats: AulaDocumentStats;
  warnings: string[];
};

/** Resultado de leer una app antigua. */
export type AulaDocumentImportResult =
  | { ok: true; preview: AulaDocumentImportPreview }
  | { ok: false; message: string };

/**
 * Comprueba que un valor sea un objeto simple.
 * @param value - Valor candidato.
 * @returns El objeto o `null`.
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * Valida un documento construido por un importador.
 * @param source - App de origen.
 * @param document - Documento candidato.
 * @param warnings - Avisos de conversión.
 * @returns La vista previa o un error legible.
 */
function finishImport(
  source: AulaDocumentImportSource,
  document: AulaDocument,
  warnings: string[],
): AulaDocumentImportResult {
  const result = parseAulaDocument(document);
  if (!result.ok) {
    return { ok: false, message: `No se pudo importar el documento: ${result.message}` };
  }
  return {
    ok: true,
    preview: {
      source,
      document: result.document,
      stats: result.stats,
      warnings,
    },
  };
}

/**
 * Lee el estado de Notas y documentos sin modificar el original.
 * @param value - Estado `{ title, content }` de la app antigua.
 * @returns La vista previa en el modelo unificado.
 */
export function importNotesDocument(value: unknown): AulaDocumentImportResult {
  const candidate = asRecord(value);
  if (!candidate || !("content" in candidate)) {
    return { ok: false, message: "Notas y documentos no contiene un documento válido." };
  }
  if (typeof candidate.title !== "string") {
    return { ok: false, message: "El documento de Notas y documentos no tiene un título válido." };
  }

  const warnings: string[] = [];
  const title = candidate.title.trim() || "Notas importadas";
  if (!candidate.title.trim()) warnings.push("El documento original no tenía título.");
  const stripped = stripDuplicateTitleHeading(candidate.content as AulaDocument["content"], title);
  if (stripped.warning) warnings.push(stripped.warning);

  return finishImport("documentos", {
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title,
    content: stripped.content,
  }, warnings);
}

/**
 * Lee el estado de Diagramas y lo convierte en un documento con un bloque Mermaid.
 * @param value - Estado `{ code }` de la app antigua.
 * @returns La vista previa en el modelo unificado.
 */
export function importMermaidDocument(value: unknown): AulaDocumentImportResult {
  const candidate = asRecord(value);
  if (!candidate || typeof candidate.code !== "string") {
    return { ok: false, message: "Diagramas no contiene un diagrama válido." };
  }
  const code = candidate.code;
  if (!code.trim()) {
    return { ok: false, message: "El diagrama está vacío." };
  }
  if (code.length > AULA_DOCUMENT_MAX_MERMAID_CODE_LENGTH) {
    return { ok: false, message: "El diagrama supera el tamaño permitido para un documento." };
  }

  return finishImport("mermaid", {
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title: "Diagrama importado",
    content: {
      type: "doc",
      content: [{ type: "mermaidBlock", attrs: { code } }],
    },
  }, ["El diagrama se importa como un documento de un solo bloque."]);
}

/**
 * Lee el estado de Presentaciones y convierte su Markdown en el documento unificado.
 * @param value - Estado `{ markdown }` de la app antigua.
 * @returns La vista previa con saltos de diapositiva.
 */
export function importPresentationDocument(value: unknown): AulaDocumentImportResult {
  const candidate = asRecord(value);
  if (!candidate || typeof candidate.markdown !== "string") {
    return { ok: false, message: "Presentaciones no contiene una presentación válida." };
  }
  if (isAulaMarkdownTooLong(candidate.markdown)) {
    return { ok: false, message: "La presentación supera el tamaño permitido." };
  }

  const converted = markdownToDocument(candidate.markdown, {
    slideBreaks: true,
    titleFallback: "Presentación importada",
  });
  return finishImport("presentaciones", {
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title: converted.title,
    content: converted.content,
  }, converted.warnings);
}

/**
 * Importa un estado antiguo según su app de origen.
 * @param source - App de origen.
 * @param value - Estado guardado.
 * @returns La vista previa o un error.
 */
export function importLegacyDocument(
  source: AulaDocumentImportSource,
  value: unknown,
): AulaDocumentImportResult {
  if (source === "documentos") return importNotesDocument(value);
  if (source === "mermaid") return importMermaidDocument(value);
  return importPresentationDocument(value);
}
