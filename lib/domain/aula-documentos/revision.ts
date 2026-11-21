/** Límite del cuerpo de un comentario. */
const AULA_COMMENT_BODY_MAX_LENGTH = 2_000;

/** Límite de la cita que conserva el ancla. */
const AULA_COMMENT_QUOTE_MAX_LENGTH = 500;

/** Límite de comentarios por documento. */
export const AULA_COMMENT_MAX_PER_DOCUMENT = 500;

/** Ancla textual de un comentario en el documento. */
export type AulaCommentAnchor = {
  from: number;
  to: number;
  quote: string;
  prefix: string;
  suffix: string;
  blockIndex: number;
};

/** Estado de un comentario o hilo. */
export type AulaCommentStatus = "open" | "resolved" | "deleted";

/** Acciones que la API autoriza para el usuario actual. */
export type AulaCommentCapabilities = {
  canEdit: boolean;
  canDelete: boolean;
  canResolve: boolean;
};

/** Comentario tal como lo consume la interfaz. */
export type AulaDocumentComment = {
  id: string;
  projectId: string;
  documentId: string;
  parentId: string | null;
  authorUserId: string | null;
  authorName: string;
  body: string;
  anchor: AulaCommentAnchor;
  status: AulaCommentStatus;
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
  resolvedBy: string | null;
  capabilities: AulaCommentCapabilities;
};

/** Hilo de comentarios con respuestas de un nivel. */
export type AulaDocumentCommentThread = AulaDocumentComment & {
  replies: AulaDocumentComment[];
};

/**
 * Normaliza el cuerpo de un comentario.
 * @param value - Texto candidato.
 * @returns Texto válido o `null`.
 */
export function normalizeAulaCommentBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const body = value.trim();
  if (!body || body.length > AULA_COMMENT_BODY_MAX_LENGTH) return null;
  return body;
}

/**
 * Valida y normaliza el ancla de un comentario.
 * @param value - Ancla candidata.
 * @returns Ancla válida o `null`.
 */
export function normalizeAulaCommentAnchor(value: unknown): AulaCommentAnchor | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const from = candidate.from;
  const to = candidate.to;
  const quote = candidate.quote;
  const prefix = candidate.prefix;
  const suffix = candidate.suffix;
  const blockIndex = candidate.blockIndex;
  if (
    typeof from !== "number" || !Number.isInteger(from) || from < 0
    || typeof to !== "number" || !Number.isInteger(to) || to < from
    || typeof quote !== "string" || quote.length > AULA_COMMENT_QUOTE_MAX_LENGTH
    || typeof prefix !== "string" || prefix.length > 80
    || typeof suffix !== "string" || suffix.length > 80
    || typeof blockIndex !== "number" || !Number.isInteger(blockIndex) || blockIndex < 0
  ) {
    return null;
  }
  return { from, to, quote, prefix, suffix, blockIndex };
}
