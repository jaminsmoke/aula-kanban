import type { JSONContent } from "@tiptap/core";
import {
  AULA_DOCUMENT_SCHEMA_VERSION,
  parseAulaDocument,
  type AulaDocument,
} from "./document";
import { importLegacyDocument, type AulaDocumentImportSource } from "./importers";

/** Apps antiguas cuyos datos se pueden migrar a Aula Documentos. */
export const AULA_MIGRATION_SOURCES = [
  "documentos",
  "mermaid",
  "presentaciones",
] as const satisfies readonly AulaDocumentImportSource[];

/** Origen de una migración documental. */
export type AulaMigrationSource = (typeof AULA_MIGRATION_SOURCES)[number];

/** Nombres visibles de las apps de origen. */
export const AULA_MIGRATION_SOURCE_LABELS: Readonly<Record<AulaMigrationSource, string>> = {
  documentos: "Notas y documentos",
  mermaid: "Diagramas",
  presentaciones: "Presentaciones",
};

/** Estado leído de una app antigua, sin modificarlo. */
export type AulaMigrationSourceState = {
  source: AulaMigrationSource;
  state: unknown;
  updatedAt: number | null;
};

/** Resultado de componer el documento unificado de una migración. */
export type AulaMigrationBuildResult =
  | {
    ok: true;
    document: AulaDocument;
    importedSources: AulaMigrationSource[];
    warnings: string[];
  }
  | { ok: false; message: string; warnings: string[] };

/**
 * Crea un nodo de texto.
 * @param value - Texto visible.
 * @returns Nodo de texto.
 */
function text(value: string): JSONContent {
  return { type: "text", text: value };
}

/**
 * Crea un título.
 * @param level - Nivel permitido.
 * @param value - Texto del título.
 * @returns Nodo de título.
 */
function heading(level: 2 | 3, value: string): JSONContent {
  return { type: "heading", attrs: { level }, content: [text(value)] };
}

/**
 * Extrae el contenido raíz de un documento validado.
 * @param document - Documento importado.
 * @returns La lista de nodos de su raíz.
 */
function rootContent(document: AulaDocument): JSONContent[] {
  return document.content.content ?? [];
}

/**
 * Compone un documento de Aula con los datos disponibles de las apps antiguas.
 *
 * Si solo hay un origen y Aula está vacío, conserva el documento importado
 * tal cual. Si Aula ya tiene contenido, lo mantiene y añade cada origen como
 * una sección separada para no perder trabajo actual.
 * @param input - Documento actual de Aula y estados de las apps antiguas.
 * @returns El documento compuesto o un error legible.
 */
export function buildAulaMigrationDocument(input: {
  existing: AulaDocument | null;
  sources: AulaMigrationSourceState[];
}): AulaMigrationBuildResult {
  const imported: Array<{
    source: AulaMigrationSource;
    document: AulaDocument;
  }> = [];
  const warnings: string[] = [];

  for (const source of AULA_MIGRATION_SOURCES) {
    const entry = input.sources.find((item) => item.source === source);
    if (!entry) continue;
    const result = importLegacyDocument(source, entry.state);
    if (!result.ok) {
      warnings.push(`${AULA_MIGRATION_SOURCE_LABELS[source]}: ${result.message}`);
      continue;
    }
    imported.push({ source, document: result.preview.document });
    for (const warning of result.preview.warnings) {
      warnings.push(`${AULA_MIGRATION_SOURCE_LABELS[source]}: ${warning}`);
    }
  }

  if (imported.length === 0) {
    return {
      ok: false,
      message: "No hay datos válidos que migrar en las apps anteriores.",
      warnings,
    };
  }

  if (!input.existing && imported.length === 1) {
    return {
      ok: true,
      document: imported[0].document,
      importedSources: [imported[0].source],
      warnings,
    };
  }

  const content: JSONContent[] = input.existing ? [...rootContent(input.existing)] : [];
  for (const entry of imported) {
    if (content.length) content.push({ type: "horizontalRule" });
    content.push(heading(2, `Migrado desde ${AULA_MIGRATION_SOURCE_LABELS[entry.source]}`));
    content.push(heading(3, entry.document.title));
    content.push(...rootContent(entry.document));
  }

  const parsed = parseAulaDocument({
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title: input.existing?.title || "Documentos migrados",
    content: { type: "doc", content },
    ...(input.existing?.presentation ? { presentation: input.existing.presentation } : {}),
  });
  if (!parsed.ok) {
    return { ok: false, message: parsed.message, warnings };
  }

  return {
    ok: true,
    document: parsed.document,
    importedSources: imported.map((entry) => entry.source),
    warnings,
  };
}
