import {
  AULA_COMMENT_MAX_PER_DOCUMENT,
  normalizeAulaCommentAnchor,
  normalizeAulaCommentBody,
  type AulaCommentCapabilities,
  type AulaDocumentComment,
  type AulaDocumentCommentThread,
} from "../../domain/aula-documentos/revision";
import { selectAulaDocumentUpdatedAt } from "./documents-repository";
import {
  countAulaCommentRows,
  insertAulaCommentRow,
  selectAulaCommentRow,
  selectAulaCommentRows,
  updateAulaCommentRowIfCurrent,
  type AulaDocumentCommentRow,
} from "./comments-repository";

type Role = "owner" | "admin" | "teacher" | "student" | "guest";

/** Usuario que realiza una operación de comentario. */
type Actor = {
  userId: string | null;
  displayName: string;
  role: Role;
};

/** Resultado de operaciones de comentarios. */
export type AulaCommentResult<T> =
  | { status: "ok"; value: T }
  | { status: "not-found" | "forbidden" | "invalid" | "limit" | "conflict" };

/**
 * Convierte una fila en comentario de la API.
 * @param row - Fila de comentario.
 * @param actor - Usuario actual.
 * @returns Comentario con capacidades calculadas.
 */
function viewComment(row: AulaDocumentCommentRow, actor: Actor): AulaDocumentComment {
  let anchor = null;
  try {
    anchor = normalizeAulaCommentAnchor(JSON.parse(row.anchor) as unknown);
  } catch {
    anchor = null;
  }
  if (!anchor) anchor = { from: 0, to: 0, quote: "", prefix: "", suffix: "", blockIndex: 0 };
  const elevated = actor.role === "owner" || actor.role === "admin" || actor.role === "teacher";
  const own = Boolean(actor.userId && row.authorUserId === actor.userId);
  const open = row.status === "open";
  const capabilities: AulaCommentCapabilities = {
    canEdit: actor.role !== "guest" && own && open,
    canDelete: actor.role !== "guest" && (elevated || own),
    canResolve: elevated && !row.parentId && row.status !== "deleted",
  };
  return {
    id: row.id,
    projectId: row.projectId,
    documentId: row.documentId,
    parentId: row.parentId,
    authorUserId: row.authorUserId,
    authorName: row.authorName,
    body: row.body,
    anchor,
    status: row.status as AulaDocumentComment["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
    capabilities,
  };
}

/**
 * Comprueba que el documento pertenece al proyecto.
 * @param projectId - Proyecto.
 * @param documentId - Documento.
 * @returns `true` si existe.
 */
async function documentExists(projectId: string, documentId: string): Promise<boolean> {
  return (await selectAulaDocumentUpdatedAt(projectId, documentId)) !== null;
}

/**
 * Lista hilos de comentarios no borrados.
 * @param input - Proyecto, documento y actor.
 * @returns Hilos ordenados por creación.
 */
export async function listAulaComments(input: {
  projectId: string;
  documentId: string;
  actor: Actor;
}): Promise<AulaCommentResult<{ threads: AulaDocumentCommentThread[]; total: number }>> {
  if (!(await documentExists(input.projectId, input.documentId))) return { status: "not-found" };
  const rows = (await selectAulaCommentRows(input.projectId, input.documentId))
    .filter((row) => row.status !== "deleted");
  const roots = rows.filter((row) => !row.parentId);
  const byParent = new Map<string, AulaDocumentCommentRow[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const group = byParent.get(row.parentId) ?? [];
    group.push(row);
    byParent.set(row.parentId, group);
  }
  return {
    status: "ok",
    value: {
      total: rows.length,
      threads: roots.map((root) => ({
        ...viewComment(root, input.actor),
        replies: (byParent.get(root.id) ?? []).map((reply) => viewComment(reply, input.actor)),
      })),
    },
  };
}

/**
 * Crea un comentario raíz o una respuesta.
 * @param input - Documento, cuerpo, ancla y actor.
 * @returns El comentario creado.
 */
export async function createAulaComment(input: {
  projectId: string;
  documentId: string;
  parentId: string | null;
  body: unknown;
  anchor: unknown;
  actor: Actor;
}): Promise<AulaCommentResult<AulaDocumentComment>> {
  if (input.actor.role === "guest") return { status: "forbidden" };
  if (!(await documentExists(input.projectId, input.documentId))) return { status: "not-found" };
  const body = normalizeAulaCommentBody(input.body);
  const anchor = normalizeAulaCommentAnchor(input.anchor);
  if (!body || !anchor) return { status: "invalid" };

  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await selectAulaCommentRow(input.projectId, input.documentId, input.parentId);
    if (!parent || parent.status !== "open" || parent.parentId) return { status: "invalid" };
    parentId = parent.id;
  }
  if ((await countAulaCommentRows(input.projectId, input.documentId)) >= AULA_COMMENT_MAX_PER_DOCUMENT) {
    return { status: "limit" };
  }

  const now = Date.now();
  const row = await insertAulaCommentRow({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    documentId: input.documentId,
    parentId,
    authorUserId: input.actor.userId,
    authorName: input.actor.displayName,
    body,
    anchor: JSON.stringify(anchor),
    status: "open",
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    resolvedBy: null,
  });
  return { status: "ok", value: viewComment(row, input.actor) };
}

/**
 * Cambia el estado o el cuerpo de un comentario con control de versión.
 * @param input - Comentario, acción y actor.
 * @returns El comentario actualizado.
 */
export async function updateAulaComment(input: {
  projectId: string;
  documentId: string;
  commentId: string;
  action: "edit" | "resolve" | "reopen" | "delete";
  body?: unknown;
  expectedUpdatedAt: number;
  actor: Actor;
}): Promise<AulaCommentResult<AulaDocumentComment>> {
  if (input.actor.role === "guest") return { status: "forbidden" };
  const row = await selectAulaCommentRow(input.projectId, input.documentId, input.commentId);
  if (!row || row.status === "deleted") return { status: "not-found" };

  const elevated = input.actor.role === "owner" || input.actor.role === "admin" || input.actor.role === "teacher";
  const own = Boolean(input.actor.userId && row.authorUserId === input.actor.userId);
  if (input.action === "edit") {
    if (!own || row.status !== "open") return { status: "forbidden" };
    const body = normalizeAulaCommentBody(input.body);
    if (!body) return { status: "invalid" };
    const updated = await updateAulaCommentRowIfCurrent({
      ...input,
      id: input.commentId,
      body,
      status: row.status as "open" | "resolved" | "deleted",
      resolvedAt: row.resolvedAt,
      resolvedBy: row.resolvedBy,
    });
    if (!updated) return { status: "conflict" };
    return { status: "ok", value: viewComment(updated, input.actor) };
  }

  if (input.action === "resolve" || input.action === "reopen") {
    if (!elevated || row.parentId) return { status: "forbidden" };
    const status = input.action === "resolve" ? "resolved" : "open";
    const updated = await updateAulaCommentRowIfCurrent({
      ...input,
      id: input.commentId,
      body: row.body,
      status,
      resolvedAt: status === "resolved" ? Date.now() : null,
      resolvedBy: status === "resolved" ? input.actor.userId : null,
    });
    if (!updated) return { status: "conflict" };
    return { status: "ok", value: viewComment(updated, input.actor) };
  }

  if (!own && !elevated) return { status: "forbidden" };
  const updated = await updateAulaCommentRowIfCurrent({
    ...input,
    id: input.commentId,
    body: row.body,
    status: "deleted",
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
  });
  if (!updated) return { status: "conflict" };
  return { status: "ok", value: viewComment(updated, input.actor) };
}
