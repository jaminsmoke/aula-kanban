import {
  AULA_REVISION_RETENTION_DAYS,
  AULA_VERSION_MAX_PER_DOCUMENT,
  normalizeAulaVersionName,
  type AulaDocumentVersion,
  type AulaDocumentVersionDetail,
} from "../../domain/aula-documentos/revision";
import { isAulaDocumentJsonTooLong } from "../../domain/aula-documentos/document";
import { parseAulaDocument } from "../../domain/aula-documentos/document-validation";
import { contentText } from "../../domain/aula-documentos/text";
import { readAulaDocument } from "./documents";
import { updateAulaDocumentStateIfCurrent } from "./documents-repository";
import {
  countAulaVersionRows,
  deleteAulaVersionsBefore,
  insertAulaVersionRow,
  selectAulaVersionRow,
  selectAulaVersionSummaries,
  type AulaDocumentVersionRow,
  type AulaDocumentVersionSummaryRow,
} from "./versions-repository";

type Role = "owner" | "admin" | "teacher" | "student" | "guest";

/** Usuario que gestiona versiones. */
type Actor = {
  userId: string | null;
  displayName: string;
  role: Role;
};

/** Resultado de operaciones de historial. */
export type AulaVersionResult<T> =
  | { status: "ok"; value: T }
  | { status: "not-found" | "forbidden" | "invalid" | "limit" | "conflict" };

/**
 * Indica si el rol puede gestionar el historial.
 * @param role - Rol del proyecto.
 * @returns `true` para profesorado y administración.
 */
function canManage(role: Role): boolean {
  return role === "owner" || role === "admin" || role === "teacher";
}

/**
 * Convierte una fila de metadatos en versión de la API.
 * @param row - Fila de metadatos.
 * @returns Versión pública.
 */
function versionView(row: AulaDocumentVersionSummaryRow): AulaDocumentVersion {
  return {
    id: row.id,
    projectId: row.projectId,
    documentId: row.documentId,
    name: row.name,
    schemaVersion: row.schemaVersion,
    sizeBytes: row.sizeBytes,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    kind: row.kind as AulaDocumentVersion["kind"],
    baseUpdatedAt: row.baseUpdatedAt,
  };
}

/**
 * Convierte una fila completa en detalle de versión.
 * @param row - Fila completa.
 * @returns Detalle de versión.
 */
function versionDetail(row: AulaDocumentVersionRow): AulaDocumentVersionDetail {
  return { ...versionView(row), state: JSON.parse(row.state) as unknown };
}

/**
 * Genera el nombre de una versión cuando no se escribe uno.
 * @param timestamp - Fecha de creación.
 * @returns Nombre legible.
 */
function fallbackVersionName(timestamp: number): string {
  return `Versión del ${new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp))}`;
}

/**
 * Lista las versiones de un documento.
 * @param input - Proyecto, documento y actor.
 * @returns Metadatos de versiones.
 */
export async function listAulaVersions(input: {
  projectId: string;
  documentId: string;
  actor: Actor;
}): Promise<AulaVersionResult<{ versions: AulaDocumentVersion[]; total: number }>> {
  if (!canManage(input.actor.role)) return { status: "forbidden" };
  const document = await readAulaDocument(input.projectId, input.documentId);
  if (!document) return { status: "not-found" };
  const cutoff = Date.now() - AULA_REVISION_RETENTION_DAYS * 24 * 60 * 60 * 1_000;
  await deleteAulaVersionsBefore(input.projectId, input.documentId, cutoff);
  const rows = await selectAulaVersionSummaries(input.projectId, input.documentId);
  return { status: "ok", value: { versions: rows.map(versionView), total: rows.length } };
}

/**
 * Lee una versión completa para previsualizarla.
 * @param input - Proyecto, documento, versión y actor.
 * @returns Detalle de la versión.
 */
export async function getAulaVersion(input: {
  projectId: string;
  documentId: string;
  versionId: string;
  actor: Actor;
}): Promise<AulaVersionResult<AulaDocumentVersionDetail>> {
  if (!canManage(input.actor.role)) return { status: "forbidden" };
  const row = await selectAulaVersionRow(input.projectId, input.documentId, input.versionId);
  if (!row) return { status: "not-found" };
  try {
    return { status: "ok", value: versionDetail(row) };
  } catch {
    return { status: "invalid" };
  }
}

/**
 * Crea un snapshot manual del documento actual.
 * @param input - Proyecto, documento, nombre y actor.
 * @returns La versión creada.
 */
export async function createAulaVersion(input: {
  projectId: string;
  documentId: string;
  name: unknown;
  actor: Actor;
}): Promise<AulaVersionResult<AulaDocumentVersion>> {
  if (!canManage(input.actor.role)) return { status: "forbidden" };
  const document = await readAulaDocument(input.projectId, input.documentId);
  if (!document) return { status: "not-found" };
  const parsed = parseAulaDocument(document.state);
  if (!parsed.ok) return { status: "invalid" };
  if ((await countAulaVersionRows(input.projectId, input.documentId)) >= AULA_VERSION_MAX_PER_DOCUMENT) {
    return { status: "limit" };
  }
  const now = Date.now();
  const serialized = JSON.stringify(parsed.document);
  if (isAulaDocumentJsonTooLong(serialized)) return { status: "invalid" };
  const row = await insertAulaVersionRow({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    documentId: input.documentId,
    name: normalizeAulaVersionName(input.name) || fallbackVersionName(now),
    state: serialized,
    schemaVersion: parsed.document.schemaVersion,
    sizeBytes: serialized.length,
    createdBy: input.actor.userId,
    createdByName: input.actor.displayName,
    createdAt: now,
    kind: "manual",
    baseUpdatedAt: document.updatedAt,
  });
  return { status: "ok", value: versionView(row) };
}

/**
 * Restaura una versión con conflicto optimista y snapshot previo.
 * @param input - Proyecto, documento, versión, versión esperada y actor.
 * @returns Documento restaurado y nueva versión.
 */
export async function restoreAulaVersion(input: {
  projectId: string;
  documentId: string;
  versionId: string;
  expectedUpdatedAt: number;
  actor: Actor;
}): Promise<AulaVersionResult<{ document: unknown; updatedAt: number }>> {
  if (!canManage(input.actor.role)) return { status: "forbidden" };
  const current = await readAulaDocument(input.projectId, input.documentId);
  if (!current) return { status: "not-found" };
  const version = await selectAulaVersionRow(input.projectId, input.documentId, input.versionId);
  if (!version) return { status: "not-found" };
  let versionState: unknown;
  try {
    versionState = JSON.parse(version.state) as unknown;
  } catch {
    return { status: "invalid" };
  }
  const parsedVersion = parseAulaDocument(versionState);
  const parsedCurrent = parseAulaDocument(current.state);
  if (!parsedVersion.ok || !parsedCurrent.ok) return { status: "invalid" };
  if (current.updatedAt !== input.expectedUpdatedAt) return { status: "conflict" };

  const now = Date.now();
  const previousSerialized = JSON.stringify(parsedCurrent.document);
  await insertAulaVersionRow({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    documentId: input.documentId,
    name: `Antes de restaurar: ${version.name}`.slice(0, 120),
    state: previousSerialized,
    schemaVersion: parsedCurrent.document.schemaVersion,
    sizeBytes: previousSerialized.length,
    createdBy: input.actor.userId,
    createdByName: input.actor.displayName,
    createdAt: now,
    kind: "pre-restore",
    baseUpdatedAt: current.updatedAt,
  });

  const restoredSerialized = JSON.stringify(parsedVersion.document);
  const updatedAt = await updateAulaDocumentStateIfCurrent({
    projectId: input.projectId,
    id: input.documentId,
    title: parsedVersion.document.title.trim() || "Documento sin título",
    excerpt: contentText(parsedVersion.document.content).replace(/\s+/g, " ").trim().slice(0, 160),
    state: restoredSerialized,
    expectedUpdatedAt: input.expectedUpdatedAt,
    updatedBy: input.actor.userId,
  });
  if (updatedAt === null) return { status: "conflict" };
  return { status: "ok", value: { document: parsedVersion.document, updatedAt } };
}
