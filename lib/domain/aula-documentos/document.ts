import type { JSONContent } from "@tiptap/core";

/** Versión del documento que entiende esta entrega. */
export const AULA_DOCUMENT_SCHEMA_VERSION = 2 as const;

/** Versiones que se pueden migrar al cargar. */
const AULA_DOCUMENT_SUPPORTED_VERSIONS = new Set([1, 2]);

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
  | "mermaid-too-large";

/** Resultado de validar un valor guardado. */
export type AulaDocumentParseResult =
  | { ok: true; document: AulaDocument; stats: AulaDocumentStats }
  | { ok: false; code: AulaDocumentErrorCode; message: string };

const ALLOWED_NODES = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
  "mermaidBlock",
  "slideBreak",
]);

const ALLOWED_MARKS = new Set(["bold", "italic", "underline", "strike", "code", "link"]);
const ALLOWED_TEXT_ALIGNMENTS = new Set(["left", "center", "right", "justify"]);

class DocumentValidationError extends Error {
  constructor(
    readonly code: AulaDocumentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

type ValidationContext = {
  nodes: number;
  depth: number;
  textLength: number;
  mermaidBlocks: number;
  slideBreaks: number;
  mermaidCodeLength: number;
};

/**
 * Normaliza un enlace para que solo use protocolos seguros.
 * @param value - Texto escrito por la persona.
 * @returns El enlace normalizado o `null` si no es válido.
 */
export function normalizeAulaLink(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (/^(javascript|data|vbscript|file):/i.test(text)) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
      ? `mailto:${text}`
      : `https://${text}`;

  try {
    const url = new URL(candidate);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Valida las marcas de un nodo de texto y descarta las que no se entienden.
 * @param value - Lista de marcas candidata.
 * @returns Marcas normalizadas o `null` si la forma no es válida.
 */
function normalizeMarks(value: unknown): NonNullable<JSONContent["marks"]> | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8) return null;

  const marks: NonNullable<JSONContent["marks"]> = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) return null;
    const mark = entry as Record<string, unknown>;
    if (typeof mark.type !== "string" || !ALLOWED_MARKS.has(mark.type) || seen.has(mark.type)) continue;
    seen.add(mark.type);

    if (mark.type !== "link") {
      marks.push({ type: mark.type });
      continue;
    }

    if (typeof mark.attrs !== "object" || mark.attrs === null) continue;
    const href = (mark.attrs as Record<string, unknown>).href;
    if (typeof href !== "string") continue;
    const safeHref = normalizeAulaLink(href);
    if (!safeHref) continue;
    marks.push({
      type: "link",
      attrs: {
        href: safeHref,
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    });
  }
  return marks;
}

/**
 * Normaliza la alineación de un nodo de texto.
 * @param attrs - Atributos del nodo.
 * @returns La alineación admitida o `null`.
 */
function normalizeTextAlign(attrs: Record<string, unknown>): string | null {
  const value = attrs.textAlign;
  return typeof value === "string" && ALLOWED_TEXT_ALIGNMENTS.has(value) ? value : null;
}

/**
 * Valida un nodo del documento y descarta atributos no reconocidos.
 * @param value - Nodo candidato.
 * @param context - Contadores compartidos.
 * @param depth - Profundidad actual.
 * @returns El nodo validado.
 */
function normalizeNode(value: unknown, context: ValidationContext, depth: number): JSONContent {
  if (depth > AULA_DOCUMENT_MAX_DEPTH) {
    throw new DocumentValidationError("too-deep", "El documento está anidado demasiado profundamente.");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DocumentValidationError("invalid-content", "El documento contiene un nodo no válido.");
  }

  context.depth = Math.max(context.depth, depth);
  context.nodes += 1;
  if (context.nodes > AULA_DOCUMENT_MAX_NODES) {
    throw new DocumentValidationError("too-many-nodes", "El documento tiene demasiados nodos.");
  }

  const node = value as Record<string, unknown>;
  if (typeof node.type !== "string" || !ALLOWED_NODES.has(node.type)) {
    throw new DocumentValidationError("invalid-content", "El documento contiene un nodo no compatible.");
  }

  if (node.type === "text") {
    if (typeof node.text !== "string") {
      throw new DocumentValidationError("invalid-content", "El documento contiene texto no válido.");
    }
    if (node.text.length > AULA_DOCUMENT_MAX_TEXT_LENGTH) {
      throw new DocumentValidationError("too-much-text", "El documento contiene demasiado texto.");
    }
    const marks = normalizeMarks(node.marks);
    if (marks === null) {
      throw new DocumentValidationError("invalid-content", "El documento contiene marcas no válidas.");
    }
    context.textLength += node.text.length;
    if (context.textLength > AULA_DOCUMENT_MAX_TEXT_LENGTH) {
      throw new DocumentValidationError("too-much-text", "El documento contiene demasiado texto.");
    }
    return {
      type: "text",
      text: node.text,
      ...(marks.length ? { marks } : {}),
    };
  }

  if (node.type === "hardBreak" || node.type === "horizontalRule") {
    return { type: node.type };
  }

  if (node.type === "slideBreak") {
    if (node.content !== undefined) {
      throw new DocumentValidationError("invalid-content", "El salto de diapositiva no admite contenido.");
    }
    context.slideBreaks += 1;
    return { type: "slideBreak" };
  }

  if (node.type === "mermaidBlock") {
    const attrs = typeof node.attrs === "object" && node.attrs !== null
      ? node.attrs as Record<string, unknown>
      : {};
    const code = attrs.code;
    if (typeof code !== "string") {
      throw new DocumentValidationError("invalid-content", "El bloque Mermaid no tiene código válido.");
    }
    if (code.length > AULA_DOCUMENT_MAX_MERMAID_CODE_LENGTH) {
      throw new DocumentValidationError("mermaid-too-long", "Un diagrama Mermaid supera el tamaño permitido.");
    }
    context.mermaidBlocks += 1;
    context.mermaidCodeLength += code.length;
    if (context.mermaidBlocks > AULA_DOCUMENT_MAX_MERMAID_BLOCKS) {
      throw new DocumentValidationError("too-many-mermaid", "El documento tiene demasiados diagramas.");
    }
    if (context.mermaidCodeLength > AULA_DOCUMENT_MAX_MERMAID_TOTAL_LENGTH) {
      throw new DocumentValidationError("mermaid-too-large", "Los diagramas del documento ocupan demasiado.");
    }
    return { type: "mermaidBlock", attrs: { code } };
  }

  if (node.type === "doc" && depth !== 0) {
    throw new DocumentValidationError("invalid-content", "El documento tiene un nodo raíz anidado.");
  }

  const content = normalizeContent(node.content, context, depth);
  if (content === null) {
    throw new DocumentValidationError("invalid-content", "El contenido del documento no es válido.");
  }

  if (node.type === "paragraph") {
    const attrs = typeof node.attrs === "object" && node.attrs !== null
      ? node.attrs as Record<string, unknown>
      : {};
    const textAlign = normalizeTextAlign(attrs);
    return {
      type: "paragraph",
      ...(textAlign ? { attrs: { textAlign } } : {}),
      content,
    };
  }

  if (node.type === "taskItem") {
    const attrs = typeof node.attrs === "object" && node.attrs !== null
      ? node.attrs as Record<string, unknown>
      : {};
    return { type: "taskItem", attrs: { checked: attrs.checked === true }, content };
  }

  if (node.type === "heading") {
    const attrs = typeof node.attrs === "object" && node.attrs !== null
      ? node.attrs as Record<string, unknown>
      : {};
    const level = attrs.level;
    if (level !== 1 && level !== 2 && level !== 3) {
      throw new DocumentValidationError("invalid-content", "El documento contiene un título de nivel no válido.");
    }
    const textAlign = normalizeTextAlign(attrs);
    return {
      type: "heading",
      attrs: { level, ...(textAlign ? { textAlign } : {}) },
      content,
    };
  }

  if (node.type === "codeBlock") {
    const attrs = typeof node.attrs === "object" && node.attrs !== null
      ? node.attrs as Record<string, unknown>
      : {};
    const language = typeof attrs.language === "string" ? attrs.language.trim().slice(0, 30) : "";
    return {
      type: "codeBlock",
      ...(language ? { attrs: { language } } : {}),
      content,
    };
  }

  if (node.type === "orderedList") {
    const attrs = typeof node.attrs === "object" && node.attrs !== null
      ? node.attrs as Record<string, unknown>
      : {};
    const start = Number.isInteger(attrs.start) && Number(attrs.start) >= 1 && Number(attrs.start) <= 100_000
      ? Number(attrs.start)
      : 1;
    return { type: "orderedList", attrs: { start }, content };
  }

  return { type: node.type, content };
}

/**
 * Valida los hijos de un nodo.
 * @param value - Contenido candidato.
 * @param context - Contadores compartidos.
 * @param depth - Profundidad del padre.
 * @returns Los hijos validados o `null` si la forma no es válida.
 */
function normalizeContent(value: unknown, context: ValidationContext, depth: number): JSONContent[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  if (value.length > AULA_DOCUMENT_MAX_CHILDREN) {
    throw new DocumentValidationError("too-many-children", "El documento tiene demasiados elementos en un mismo nivel.");
  }
  const content: JSONContent[] = [];
  for (const child of value) {
    content.push(normalizeNode(child, context, depth + 1));
  }
  return content;
}

/**
 * Crea un documento vacío listo para editar.
 * @param title - Título inicial.
 * @returns El documento con un párrafo vacío.
 */
export function createEmptyAulaDocument(title = "Documento sin título"): AulaDocument {
  return {
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title,
    content: {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
  };
}

/**
 * Normaliza las preferencias de presentación de un documento guardado.
 * @param value - Valor candidato.
 * @returns Preferencias válidas o las de por defecto.
 */
function normalizePresentation(value: unknown): AulaDocumentPresentation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...DEFAULT_AULA_PRESENTATION };
  }
  const candidate = value as Record<string, unknown>;
  const theme = candidate.theme;
  const notes: Record<string, string> = {};
  if (typeof candidate.notes === "object" && candidate.notes !== null && !Array.isArray(candidate.notes)) {
    let total = 0;
    for (const [key, note] of Object.entries(candidate.notes)) {
      if (!/^\d{1,3}$/.test(key) || Number(key) > 200 || typeof note !== "string") continue;
      const value = note.slice(0, AULA_PRESENTATION_NOTE_MAX_LENGTH);
      if (!value.trim()) continue;
      total += value.length;
      if (total > AULA_PRESENTATION_NOTES_MAX_TOTAL) break;
      notes[key] = value;
    }
  }
  return {
    theme: typeof theme === "string" && (AULA_PRESENTATION_THEMES as readonly string[]).includes(theme)
      ? theme as AulaPresentationTheme
      : DEFAULT_AULA_PRESENTATION.theme,
    ...(Object.keys(notes).length ? { notes } : {}),
  };
}

/**
 * Valida un documento leído de `app_documents`.
 * @param value - Valor candidato.
 * @returns El documento validado o un error estable.
 */
export function parseAulaDocument(value: unknown): AulaDocumentParseResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, code: "not-object", message: "El documento guardado no tiene un formato válido." };
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return { ok: false, code: "invalid-json", message: "El documento guardado no se puede leer." };
  }
  if (serialized.length > AULA_DOCUMENT_JSON_MAX_LENGTH) {
    return { ok: false, code: "too-large", message: "El documento supera el tamaño permitido." };
  }

  const candidate = value as Record<string, unknown>;
  const version = candidate.schemaVersion;
  if (typeof version !== "number" || !AULA_DOCUMENT_SUPPORTED_VERSIONS.has(version)) {
    if (typeof version === "number" && version > AULA_DOCUMENT_SCHEMA_VERSION) {
      return { ok: false, code: "unsupported-version", message: "El documento usa una versión más nueva de la que entiende esta app." };
    }
    return { ok: false, code: "invalid-schema", message: "El documento no tiene una versión de esquema válida." };
  }
  const presentation = normalizePresentation(candidate.presentation);
  if (typeof candidate.title !== "string") {
    return { ok: false, code: "invalid-title", message: "El documento no tiene un título válido." };
  }
  const title = candidate.title.trim();
  if (title.length > AULA_DOCUMENT_TITLE_MAX_LENGTH) {
    return { ok: false, code: "invalid-title", message: "El título del documento es demasiado largo." };
  }
  if (!("content" in candidate)) {
    return { ok: false, code: "invalid-content", message: "El documento no tiene contenido." };
  }

  const context: ValidationContext = {
    nodes: 0,
    depth: 0,
    textLength: 0,
    mermaidBlocks: 0,
    slideBreaks: 0,
    mermaidCodeLength: 0,
  };
  try {
    const content = normalizeNode(candidate.content, context, 0);
    if (content.type !== "doc") {
      return { ok: false, code: "invalid-content", message: "El documento no tiene un nodo raíz válido." };
    }
    return {
      ok: true,
      document: {
        schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
        title,
        content,
        presentation,
      },
      stats: {
        nodes: context.nodes,
        depth: context.depth,
        textLength: context.textLength,
        mermaidBlocks: context.mermaidBlocks,
        slideBreaks: context.slideBreaks,
      },
    };
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return { ok: false, code: "invalid-content", message: "El documento no se pudo validar." };
  }
}
