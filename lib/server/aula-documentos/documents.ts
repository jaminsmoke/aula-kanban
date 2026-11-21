import { MAX_APP_DOCUMENT_CHARS, readAppDocument } from "../apps/app-documents";
import { AULA_DOCUMENT_TITLE_MAX_LENGTH, createEmptyAulaDocument } from "../../domain/aula-documentos/document";
import { contentText } from "../../domain/aula-documentos/text";
import { parseAulaDocument } from "../../domain/aula-documentos/document-validation";
import {
  insertAulaDocumentRow,
  selectAulaDocumentRow,
  selectAulaDocumentSummaries,
  selectAulaDocumentUpdatedAt,
  updateAulaDocumentRowIfCurrent,
  updateAulaDocumentStatus,
  updateAulaDocumentTitle,
  type AulaDocumentRow,
  type AulaDocumentWrite,
} from "./documents-repository";

/** Identificador del documento creado desde la fila única de Aula Documentos. */
export const LEGACY_AULA_DOCUMENT_ID = "legacy";

/** Título de respaldo cuando el estado antiguo no se puede validar. */
const FALLBACK_TITLE = "Documento sin título";

/** Longitud máxima del extracto de la lista. */
const EXCERPT_MAX_LENGTH = 160;

/** Estado de un documento de la suite. */
export type AulaDocumentStatus = "active" | "archived" | "deleted";

/** Resumen de un documento para la lista. */
export type AulaDocumentSummary = {
  id: string;
  projectId: string;
  title: string;
  excerpt: string;
  status: AulaDocumentStatus;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
  createdBy: string | null;
  updatedBy: string | null;
};

/** Documento completo de la suite. */
export type AulaDocumentRecord = AulaDocumentSummary & { state: unknown };

/** Resultado de un guardado condicionado a la versión conocida. */
export type SaveAulaDocumentResult =
  | { status: "saved"; updatedAt: number }
  | { status: "conflict"; updatedAt: number | null }
  | { status: "too-large" }
  | { status: "invalid" };

/** Documentos activos y los que están fuera de la lista principal. */
export type AulaDocumentSuite = {
  active: AulaDocumentSummary[];
  archived: AulaDocumentSummary[];
  deleted: AulaDocumentSummary[];
};

/**
 * Deriva el título y el extracto del estado canónico.
 * @param state - Estado recibido o leído.
 * @returns Metadatos de lista; usa valores seguros si el estado no es válido.
 */
function metadataFromState(state: unknown): { title: string; excerpt: string } {
  const parsed = parseAulaDocument(state);
  if (!parsed.ok) return { title: FALLBACK_TITLE, excerpt: "" };
  return {
    title: parsed.document.title.trim() || FALLBACK_TITLE,
    excerpt: contentText(parsed.document.content).replace(/\s+/g, " ").trim().slice(0, EXCERPT_MAX_LENGTH),
  };
}

/**
 * Convierte una fila en resumen.
 * @param row - Fila de la base de datos.
 * @returns Resumen público de la lista.
 */
function summaryFromRow(row: Omit<AulaDocumentRow, "state">): AulaDocumentSummary {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    excerpt: row.excerpt,
    status: row.status as AulaDocumentStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  };
}

/**
 * Migra la fila única de `app_documents` al documento `legacy` si aún no existe.
 * La operación es idempotente, no borra la fila antigua y conserva el estado
 * aunque no se pueda validar.
 * @param projectId - Proyecto activo.
 * @returns El documento migrado, o `null` si el proyecto no tenía documento.
 */
export async function migrateLegacyAulaDocument(projectId: string): Promise<AulaDocumentSummary | null> {
  const existing = await selectAulaDocumentRow(projectId, LEGACY_AULA_DOCUMENT_ID);
  if (existing) return summaryFromRow(existing);

  const legacy = await readAppDocument(projectId, "aula-documentos");
  if (!legacy) return null;

  const metadata = metadataFromState(legacy.state);
  const serialized = JSON.stringify(legacy.state);
  if (serialized.length > MAX_APP_DOCUMENT_CHARS) return null;

  const inserted = await insertAulaDocumentRow({
    projectId,
    id: LEGACY_AULA_DOCUMENT_ID,
    title: metadata.title,
    excerpt: metadata.excerpt,
    state: serialized,
    status: "active",
    createdAt: legacy.updatedAt,
    updatedAt: legacy.updatedAt,
    archivedAt: null,
    createdBy: null,
    updatedBy: null,
  });
  if (inserted) return summaryFromRow(inserted);
  const concurrent = await selectAulaDocumentRow(projectId, LEGACY_AULA_DOCUMENT_ID);
  return concurrent ? summaryFromRow(concurrent) : null;
}

/**
 * Lista la suite de un proyecto, migrando el documento único si hace falta.
 * @param projectId - Proyecto activo.
 * @returns Documentos agrupados por estado.
 */
export async function listAulaDocumentSuite(projectId: string): Promise<AulaDocumentSuite> {
  await migrateLegacyAulaDocument(projectId);
  const rows = await selectAulaDocumentSummaries(projectId);
  const summaries = rows.map(summaryFromRow);
  return {
    active: summaries.filter((document) => document.status === "active"),
    archived: summaries.filter((document) => document.status === "archived"),
    deleted: summaries.filter((document) => document.status === "deleted"),
  };
}

/**
 * Lee un documento completo por id, migrando `legacy` si corresponde.
 * @param projectId - Proyecto activo.
 * @param id - Identificador del documento.
 * @returns El documento o `null` si no existe en el proyecto.
 */
export async function readAulaDocument(projectId: string, id: string): Promise<AulaDocumentRecord | null> {
  if (id === LEGACY_AULA_DOCUMENT_ID) await migrateLegacyAulaDocument(projectId);
  const row = await selectAulaDocumentRow(projectId, id);
  if (!row) return null;
  return { ...summaryFromRow(row), state: JSON.parse(row.state) as unknown };
}

/**
 * Guarda el estado de un documento solo si la versión conocida sigue vigente.
 * @param input - Proyecto, documento, estado, autor y versión esperada.
 * @returns El resultado del guardado.
 */
export async function saveAulaDocumentIfCurrent(input: {
  projectId: string;
  id: string;
  state: unknown;
  updatedByUserId: string | null;
  expectedUpdatedAt: number | null;
}): Promise<SaveAulaDocumentResult> {
  if (input.id === LEGACY_AULA_DOCUMENT_ID) await migrateLegacyAulaDocument(input.projectId);

  let serialized: string;
  try {
    serialized = JSON.stringify(input.state);
  } catch {
    return { status: "invalid" };
  }
  if (serialized.length > MAX_APP_DOCUMENT_CHARS) return { status: "too-large" };

  const metadata = metadataFromState(input.state);
  const now = Date.now();
  const write: AulaDocumentWrite = {
    projectId: input.projectId,
    id: input.id,
    title: metadata.title,
    excerpt: metadata.excerpt,
    state: serialized,
    status: "active",
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    createdBy: input.updatedByUserId,
    updatedBy: input.updatedByUserId,
  };

  if (input.expectedUpdatedAt === null) {
    const inserted = await insertAulaDocumentRow(write);
    if (inserted) return { status: "saved", updatedAt: inserted.updatedAt };
    return { status: "conflict", updatedAt: await selectAulaDocumentUpdatedAt(input.projectId, input.id) };
  }

  const saved = await updateAulaDocumentRowIfCurrent({ ...write, expectedUpdatedAt: input.expectedUpdatedAt });
  if (saved !== null) return { status: "saved", updatedAt: saved };
  return { status: "conflict", updatedAt: await selectAulaDocumentUpdatedAt(input.projectId, input.id) };
}

/** Resultado de crear o duplicar un documento. */
export type CreateAulaDocumentResult =
  | { status: "created"; document: AulaDocumentSummary }
  | { status: "too-large" }
  | { status: "invalid" };

/**
 * Crea un documento vacío o con un estado inicial.
 * @param input - Proyecto, título, estado opcional y autor.
 * @returns El documento creado.
 */
export async function createAulaDocument(input: {
  projectId: string;
  title?: string;
  state?: unknown;
  createdBy: string | null;
}): Promise<CreateAulaDocumentResult> {
  const state = input.state ?? createEmptyAulaDocument(input.title);
  const parsed = parseAulaDocument(state);
  const title = (input.title?.trim() || (parsed.ok ? parsed.document.title : "") || "Documento sin título")
    .slice(0, AULA_DOCUMENT_TITLE_MAX_LENGTH);
  let serialized: string;
  try {
    serialized = JSON.stringify(state);
  } catch {
    return { status: "invalid" };
  }
  if (serialized.length > MAX_APP_DOCUMENT_CHARS) return { status: "too-large" };

  const metadata = metadataFromState(state);
  const now = Date.now();
  const inserted = await insertAulaDocumentRow({
    projectId: input.projectId,
    id: globalThis.crypto.randomUUID(),
    title,
    excerpt: metadata.excerpt,
    state: serialized,
    status: "active",
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  });
  return inserted ? { status: "created", document: summaryFromRow(inserted) } : { status: "invalid" };
}

/**
 * Duplica un documento existente en uno nuevo.
 * @param projectId - Proyecto activo.
 * @param sourceId - Documento de origen.
 * @param createdBy - Cuenta que duplica.
 * @returns El documento creado o `null` si el origen no existe.
 */
export async function duplicateAulaDocument(
  projectId: string,
  sourceId: string,
  createdBy: string | null,
): Promise<CreateAulaDocumentResult | null> {
  const source = await selectAulaDocumentRow(projectId, sourceId);
  if (!source) return null;
  const title = `${source.title} (copia)`.slice(0, AULA_DOCUMENT_TITLE_MAX_LENGTH);
  const parsed = parseAulaDocument(JSON.parse(source.state) as unknown);
  const state = parsed.ok ? { ...parsed.document, title } : JSON.parse(source.state) as unknown;
  return createAulaDocument({ projectId, title, state, createdBy });
}

/**
 * Renombra un documento.
 * @param projectId - Proyecto activo.
 * @param id - Documento.
 * @param title - Título nuevo.
 * @param updatedBy - Cuenta que cambia el título.
 * @returns El resumen actualizado o `null`.
 */
export async function renameAulaDocument(
  projectId: string,
  id: string,
  title: string,
  updatedBy: string | null,
): Promise<AulaDocumentSummary | null> {
  const normalized = (title.trim() || "Documento sin título").slice(0, AULA_DOCUMENT_TITLE_MAX_LENGTH);
  const row = await updateAulaDocumentTitle(projectId, id, normalized, updatedBy);
  return row ? summaryFromRow(row) : null;
}

/**
 * Archiva, elimina lógicamente o restaura un documento.
 * @param projectId - Proyecto activo.
 * @param id - Documento.
 * @param status - Estado nuevo.
 * @param updatedBy - Cuenta que cambia el estado.
 * @returns El resumen actualizado o `null`.
 */
export async function changeAulaDocumentStatus(
  projectId: string,
  id: string,
  status: "active" | "archived" | "deleted",
  updatedBy: string | null,
): Promise<AulaDocumentSummary | null> {
  await migrateLegacyAulaDocument(projectId);
  const row = await updateAulaDocumentStatus(
    projectId,
    id,
    status,
    status === "active" ? null : Date.now(),
    updatedBy,
  );
  return row ? summaryFromRow(row) : null;
}
