import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { boards, taskAssignees, tasks } from "../../../db/schema";
import type { BoardOwnerType } from "./board-types";

/**
 * Acceso D1 a las pizarras y a las referencias que deciden su dueño.
 *
 * Los permisos, los mensajes y la revisión optimista viven en `boards.ts`;
 * este módulo solo comprueba dueños y lee o escribe filas.
 */

/** Fila de `boards`. */
export type BoardRow = typeof boards.$inferSelect;

/** Fila de `task_assignees` usada para autorizar al alumnado. */
export type TaskAssigneeRow = typeof taskAssignees.$inferSelect;

/**
 * Indica si la tarea existe en el proyecto.
 * @param projectId - Identificador del proyecto.
 * @param taskId - Identificador de la tarea.
 * @returns `true` cuando la tarea pertenece al proyecto.
 */
export async function taskExists(projectId: string, taskId: string): Promise<boolean> {
  const [task] = await getDb().select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));
  return Boolean(task);
}

/**
 * Lista los responsables de una tarea en el proyecto.
 * @param projectId - Identificador del proyecto.
 * @param taskId - Identificador de la tarea.
 * @returns Las filas de `task_assignees`.
 */
export async function findTaskAssigneeRows(projectId: string, taskId: string): Promise<TaskAssigneeRow[]> {
  return getDb().select().from(taskAssignees).where(and(eq(taskAssignees.projectId, projectId), eq(taskAssignees.taskId, taskId)));
}

/**
 * Busca la pizarra de un dueño.
 * @param projectId - Identificador del proyecto.
 * @param ownerType - Tipo de dueño.
 * @param ownerId - Identificador de la tarea o del proyecto.
 * @returns La fila o `null`.
 */
export async function findBoardRow(projectId: string, ownerType: BoardOwnerType, ownerId: string): Promise<BoardRow | null> {
  const [board] = await getDb().select().from(boards).where(and(
    eq(boards.projectId, projectId),
    eq(boards.ownerType, ownerType),
    eq(boards.ownerId, ownerId),
  ));
  return board ?? null;
}

/**
 * Crea la primera versión de una pizarra sin pisar otra creada a la vez.
 * @param values - Fila completa con revisión 1.
 * @returns La fila creada o `null` si ya existía.
 */
export async function insertBoardRow(values: typeof boards.$inferInsert): Promise<BoardRow | null> {
  const [saved] = await getDb().insert(boards).values(values).onConflictDoNothing().returning();
  return saved ?? null;
}

/**
 * Actualiza el snapshot solo si la revisión esperada sigue vigente.
 * @param input - Proyecto, dueño, snapshot y revisión esperada.
 * @returns La fila actualizada o `null` si otra sesión guardó antes.
 */
export async function updateBoardRowIfCurrent(input: {
  projectId: string;
  ownerType: BoardOwnerType;
  ownerId: string;
  snapshot: string;
  revision: number;
  updatedAt: number;
}): Promise<BoardRow | null> {
  const [saved] = await getDb().update(boards).set({
    snapshot: input.snapshot,
    revision: sql`${boards.revision} + 1`,
    updatedAt: input.updatedAt,
  }).where(and(
    eq(boards.projectId, input.projectId),
    eq(boards.ownerType, input.ownerType),
    eq(boards.ownerId, input.ownerId),
    eq(boards.revision, input.revision),
  )).returning();
  return saved ?? null;
}
