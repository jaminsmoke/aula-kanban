import type { JSONContent } from "@tiptap/core";

/** Versión del documento que entiende esta entrega. */
export const AULA_DOCUMENT_SCHEMA_VERSION = 3 as const;

/** Título máximo del documento. */
export const AULA_DOCUMENT_TITLE_MAX_LENGTH = 120;

/** Límite local, por debajo del límite de 200.000 del endpoint. */
export const AULA_DOCUMENT_JSON_MAX_LENGTH = 190_000;

/** Límites defensivos del árbol Tiptap. */
export const AULA_DOCUMENT_MAX_NODES = 4_000;
export const AULA_DOCUMENT_MAX_DEPTH = 24;
export const AULA_DOCUMENT_MAX_CHILDREN = 1_000;
export const AULA_DOCUMENT_MAX_TEXT_LENGTH = 100_000;

/** Límites de los diagramas dentro del documento. */
export const AULA_DOCUMENT_MAX_MERMAID_BLOCKS = 12;
export const AULA_DOCUMENT_MAX_MERMAID_CODE_LENGTH = 20_000;
export const AULA_DOCUMENT_MAX_MERMAID_TOTAL_LENGTH = 80_000;

/** Límites de las imágenes dentro del documento. */
export const AULA_DOCUMENT_MAX_IMAGES = 30;
export const AULA_DOCUMENT_MAX_IMAGE_TEXT_TOTAL = 20_000;

/** Límites defensivos de las tablas. */
export const AULA_DOCUMENT_MAX_TABLES = 20;
export const AULA_DOCUMENT_MAX_TABLE_ROWS = 50;
export const AULA_DOCUMENT_MAX_TABLE_COLUMNS = 20;
export const AULA_DOCUMENT_MAX_TABLE_CELLS = 400;
export const AULA_DOCUMENT_MAX_TABLE_CELLS_TOTAL = 1_000;
export const AULA_TABLE_MAX_SPAN = 20;

/** Temas de presentación disponibles. */
export const AULA_PRESENTATION_THEMES = ["aula", "claro", "oscuro"] as const;

/** Tema de presentación del documento. */
export type AulaPresentationTheme = (typeof AULA_PRESENTATION_THEMES)[number];

/** Límite de una nota de diapositiva. */
export const AULA_PRESENTATION_NOTE_MAX_LENGTH = 5_000;

/** Límite total de las notas de presentación. */
export const AULA_PRESENTATION_NOTES_MAX_TOTAL = 20_000;

/** Preferencias de presentación persistidas con el documento. */
export type AulaDocumentPresentation = {
  theme: AulaPresentationTheme;
  notes?: Record<string, string>;
};

/** Presentación por defecto para documentos nuevos o migrados. */
export const DEFAULT_AULA_PRESENTATION: AulaDocumentPresentation = { theme: "aula" };

/** Documento unificado que se guarda en `app_documents`. */
export type AulaDocument = {
  schemaVersion: typeof AULA_DOCUMENT_SCHEMA_VERSION;
  title: string;
  content: JSONContent;
  presentation?: AulaDocumentPresentation;
};

/** Resumen calculado al validar un documento. */
export type AulaDocumentStats = {
  nodes: number;
  depth: number;
  textLength: number;
  mermaidBlocks: number;
  slideBreaks: number;
  images: number;
};

/** Códigos de error estables para la interfaz. */
export type AulaDocumentErrorCode =
  | "not-object"
  | "invalid-json"
  | "too-large"
  | "invalid-schema"
  | "unsupported-version"
  | "invalid-title"
  | "invalid-content"
  | "too-many-nodes"
  | "too-deep"
  | "too-many-children"
  | "too-much-text"
  | "too-many-mermaid"
  | "mermaid-too-long"
  | "mermaid-too-large"
  | "invalid-image"
  | "too-many-images"
  | "image-text-too-long"
  | "invalid-table"
  | "too-many-tables"
  | "table-too-large";

/** Resultado de validar un valor guardado. */
export type AulaDocumentParseResult =
  | { ok: true; document: AulaDocument; stats: AulaDocumentStats }
  | { ok: false; code: AulaDocumentErrorCode; message: string };

/** Error interno de normalización con un código estable. */
export class DocumentValidationError extends Error {
  constructor(
    readonly code: AulaDocumentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

/** Contadores compartidos durante la validación del árbol. */
export type ValidationContext = {
  nodes: number;
  depth: number;
  textLength: number;
  mermaidBlocks: number;
  slideBreaks: number;
  mermaidCodeLength: number;
  images: number;
  imageTextLength: number;
  tables: number;
  tableCells: number;
};
