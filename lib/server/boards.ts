import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { boards, taskAssignees, tasks } from "../../db/schema";
import type { Access } from "./project-access";

/**
 * Servicio compartido de pizarras.
 *
 * La API HTTP y las herramientas MCP usan esta misma capa para validar el
 * dueño, los permisos y la revisión optimista. La API conserva su contrato de
 * transporte; aquí solo viven las reglas de la pizarra.
 */

/** Tipos de dueño de una pizarra. */
export const BOARD_OWNER_TYPES = ["task", "project", "space"] as const;
/** Tipo de dueño de una pizarra. */
export type BoardOwnerType = (typeof BOARD_OWNER_TYPES)[number];

/** Límite del snapshot serializado, en caracteres. */
export const MAX_BOARD_SNAPSHOT_BYTES = 2 * 1024 * 1024;

/** Mensajes públicos compartidos por la API y MCP. */
export const BOARD_OWNER_NOT_FOUND = "No se encuentra el dueño de la pizarra.";
export const BOARD_WRITE_FORBIDDEN = "No puedes editar la pizarra de este elemento.";
export const BOARD_CONFLICT = "La pizarra cambió en otra sesión. Actualiza antes de guardar.";
export const BOARD_INVALID = "La pizarra no es válida o supera los 2 MB.";

/** Pizarra tal como la devuelve el servicio. */
export type BoardRecord = {
  ownerType: BoardOwnerType;
  ownerId: string;
  snapshot: string;
  revision: number;
  updatedAt: number;
};

/** Fallo de negocio del servicio. */
export type BoardFailure = {
  ok: false;
  status: 400 | 403 | 404 | 409;
  message: string;
  /** Revisión vigente cuando el fallo es un conflicto. */
  revisionActual?: number;
};

/** Resultado de una operación de pizarra. */
export type BoardResult = { ok: true; value: BoardRecord } | BoardFailure;

type BoardRow = typeof boards.$inferSelect;

/**
 * Construye un fallo del servicio.
 * @param status - Estado HTTP equivalente.
 * @param message - Mensaje público.
 * @param revisionActual - Revisión vigente en un conflicto.
 * @returns El fallo tipado.
 */
function failure(status: BoardFailure["status"], message: string, revisionActual?: number): BoardFailure {
  return revisionActual === undefined
    ? { ok: false, status, message }
    : { ok: false, status, message, revisionActual };
}

/**
 * Adapta una fila de D1 al contrato del servicio.
 * @param row - Fila de `boards`.
 * @returns La pizarra con el tipo de dueño validado.
 */
function view(row: BoardRow): BoardRecord {
  return {
    ownerType: row.ownerType as BoardOwnerType,
    ownerId: row.ownerId,
    snapshot: row.snapshot,
    revision: row.revision,
    updatedAt: row.updatedAt,
  };
}

/**
 * Indica si el dueño existe en este proyecto.
 * @param projectId - Identificador del proyecto.
 * @param ownerType - Tipo de dueño (`task`, `project` o `space`).
 * @param ownerId - Identificador de la tarea o del proyecto.
 * @returns `true` cuando el dueño existe y pertenece al proyecto.
 */
export async function ownerExists(projectId: string, ownerType: BoardOwnerType, ownerId: string): Promise<boolean> {
  if (ownerType === "task") {
    const [task] = await getDb().select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, ownerId), eq(tasks.projectId, projectId)));
    return Boolean(task);
  }
  return ownerId === projectId;
}

/**
 * Indica si la cuenta puede editar la pizarra del dueño indicado.
 * @param access - Acceso resuelto de la cuenta al proyecto.
 * @param projectId - Identificador del proyecto.
 * @param ownerType - Tipo de dueño (`task`, `project` o `space`).
 * @param ownerId - Identificador de la tarea o del proyecto.
 * @returns `true` cuando puede editarla (el alumnado solo en sus tareas).
 */
export async function canWrite(access: Access, projectId: string, ownerType: BoardOwnerType, ownerId: string): Promise<boolean> {
  if (access.role === "guest") return false;
  if (access.role !== "student") return true;
  if (ownerType !== "task" || !access.studentSection) return false;
  const refs = await getDb().select().from(taskAssignees).where(and(eq(taskAssignees.projectId, projectId), eq(taskAssignees.taskId, ownerId)));
  return refs.length === 1 && refs[0].kind === "student" && refs[0].profileId === access.studentSection;
}

/**
 * Lee la pizarra o devuelve una vacía con revisión 0.
 * @param projectId - Identificador del proyecto.
 * @param ownerType - Tipo de dueño.
 * @param ownerId - Identificador de la tarea o del proyecto.
 * @returns La pizarra o el fallo de dueño.
 */
export async function readBoard(projectId: string, ownerType: BoardOwnerType, ownerId: string): Promise<BoardResult> {
  if (!await ownerExists(projectId, ownerType, ownerId)) return failure(404, BOARD_OWNER_NOT_FOUND);
  const [board] = await getDb().select().from(boards).where(and(
    eq(boards.projectId, projectId),
    eq(boards.ownerType, ownerType),
    eq(boards.ownerId, ownerId),
  ));
  return {
    ok: true,
    value: board ? view(board) : { ownerType, ownerId, snapshot: "", revision: 0, updatedAt: 0 },
  };
}

/** Entrada para guardar una pizarra. */
export type SaveBoardInput = {
  projectId: string;
  access: Access;
  ownerType: BoardOwnerType;
  ownerId: string;
  snapshot: string;
  revision: number;
};

/**
 * Guarda un snapshot con revisión optimista.
 * @param input - Proyecto, acceso, dueño, snapshot y revisión esperada.
 * @returns La pizarra guardada o el fallo de dueño, permiso o conflicto.
 */
export async function saveBoard(input: SaveBoardInput): Promise<BoardResult> {
  if (input.snapshot.length > MAX_BOARD_SNAPSHOT_BYTES) return failure(400, BOARD_INVALID);
  if (!await ownerExists(input.projectId, input.ownerType, input.ownerId)) return failure(404, BOARD_OWNER_NOT_FOUND);
  if (!await canWrite(input.access, input.projectId, input.ownerType, input.ownerId)) return failure(403, BOARD_WRITE_FORBIDDEN);

  const db = getDb();
  const now = Date.now();
  const [saved] = input.revision === 0
    ? await db.insert(boards).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        snapshot: input.snapshot,
        revision: 1,
        updatedAt: now,
      }).onConflictDoNothing().returning()
    : await db.update(boards).set({
        snapshot: input.snapshot,
        revision: sql`${boards.revision} + 1`,
        updatedAt: now,
      }).where(and(
        eq(boards.projectId, input.projectId),
        eq(boards.ownerType, input.ownerType),
        eq(boards.ownerId, input.ownerId),
        eq(boards.revision, input.revision),
      )).returning();

  if (saved) return { ok: true, value: view(saved) };

  const [current] = await db.select().from(boards).where(and(
    eq(boards.projectId, input.projectId),
    eq(boards.ownerType, input.ownerType),
    eq(boards.ownerId, input.ownerId),
  ));
  return failure(409, BOARD_CONFLICT, current?.revision);
}
