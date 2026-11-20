import { and, eq, sql, type SQL } from "drizzle-orm";
import { getDb } from "../../../db";
import { boards, tasks } from "../../../db/schema";
import type { TaskRef, TaskRow, TaskWriteFields } from "./types";

/**
 * Acceso D1 de las mutaciones de tareas: alta con referencias, edición
 * condicionada por revisión, cambio de estado y borrado con su pizarra.
 *
 * Las reglas de rol, la validación de responsables y los mensajes viven en
 * `mutations.ts`; aquí se ejecutan las sentencias y los lotes.
 */

/** Guarda SQL emitida por `permissions.ts` para las sentencias preparadas. */
export type TaskPreparedGuard = { sql: string; args: string[] };

/** Datos de alta de una tarea con sus responsables. */
export type CreateTaskRowInput = {
  id: string;
  projectId: string;
  user: { userId: string; displayName: string };
  memberId: string | null;
  value: TaskWriteFields;
  refs: TaskRef[];
  assigneeText: string;
  guard: TaskPreparedGuard;
};

/**
 * Crea la tarea, la identidad del creador y sus responsables en un batch.
 * @param binding - Binding D1 de la instancia.
 * @param input - Datos validados y guarda de autorización.
 * @returns `true` si la guarda permitió crear la tarea.
 */
export async function createTaskWithRefs(binding: D1Database, input: CreateTaskRowInput): Promise<boolean> {
  const statements = [
    binding.prepare(`INSERT INTO tasks (id, project_id, title, description, image_url, assignee, due_date, priority, status, created_at, revision, creator_user_id, creator_member_id, creator_name) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ? WHERE ${input.guard.sql} RETURNING id`).bind(input.id, input.projectId, input.value.title, input.value.description, input.value.imageUrl ?? "", input.assigneeText, input.value.dueDate, input.value.priority, input.value.status, Date.now(), input.user.userId, input.memberId, input.user.displayName, ...input.guard.args),
    binding.prepare("INSERT INTO user_identities (id, display_name) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ?) ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name").bind(input.user.userId, input.user.displayName, input.id, input.projectId),
    ...input.refs.map((ref) => binding.prepare("INSERT INTO task_assignees (id, task_id, project_id, kind, profile_id) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ?)").bind(crypto.randomUUID(), input.id, input.projectId, ref.kind, ref.profileId, input.id, input.projectId)),
  ];
  const result = await binding.batch(statements);
  return Boolean(result[0].results?.length);
}

/**
 * Busca la tarea por identificador dentro del proyecto.
 * @param id - Identificador de la tarea.
 * @param projectId - Proyecto activo.
 * @returns La fila o `null` si ya no existe.
 */
export async function findTaskRow(id: string, projectId: string): Promise<TaskRow | null> {
  const [task] = await getDb().select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, projectId)));
  return task ?? null;
}

/**
 * Cambia solo el estado de una tarea con revisión y guardas vigentes.
 * @param input - Identificador, revisión, estado y guardas de autorización.
 * @returns La fila actualizada o `null` si cambió o ya no hay permiso.
 */
export async function updateTaskStatusRow(input: {
  id: string;
  projectId: string;
  revision: number;
  status: string;
  authGuard: SQL;
  ownGuard: SQL;
}): Promise<TaskRow | null> {
  const [updated] = await getDb().update(tasks).set({
    status: input.status,
    revision: sql`${tasks.revision} + 1`,
  }).where(and(
    eq(tasks.id, input.id),
    eq(tasks.revision, input.revision),
    eq(tasks.projectId, input.projectId),
    input.authGuard,
    input.ownGuard,
  )).returning();
  return updated ?? null;
}

/** Datos de edición completa de una tarea. */
export type UpdateTaskRowInput = {
  id: string;
  projectId: string;
  revision: number;
  value: TaskWriteFields;
  imageUrl: string;
  assigneeText: string;
  token: string;
  currentRefs: TaskRef[];
  removedRefs: TaskRef[];
  addedRefs: TaskRef[];
  guard: TaskPreparedGuard;
};

/**
 * Actualiza la tarea y sincroniza sus responsables en un batch condicionado.
 * @param binding - Binding D1 de la instancia.
 * @param input - Campos, referencias y guarda de autorización.
 * @returns `true` si la tarea seguía en la revisión y responsables esperados.
 */
export async function updateTaskWithRefs(binding: D1Database, input: UpdateTaskRowInput): Promise<boolean> {
  const referenceGuard = input.currentRefs.map(() => "AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ? AND project_id = ? AND kind = ? AND profile_id = ?)").join(" ");
  const referenceArgs = input.currentRefs.flatMap((ref) => [input.id, input.projectId, ref.kind, ref.profileId]);
  const statements = [
    binding.prepare(`UPDATE tasks SET title = ?, description = ?, image_url = ?, assignee = ?, due_date = ?, priority = ?, status = ?, revision = revision + 1, mutation_token = ? WHERE id = ? AND project_id = ? AND revision = ? AND ${input.guard.sql} AND (SELECT count(*) FROM task_assignees WHERE task_id = ? AND project_id = ?) = ? ${referenceGuard} RETURNING id`).bind(input.value.title, input.value.description, input.imageUrl, input.assigneeText, input.value.dueDate, input.value.priority, input.value.status, input.token, input.id, input.projectId, input.revision, ...input.guard.args, input.id, input.projectId, input.currentRefs.length, ...referenceArgs),
    ...input.removedRefs.map((ref) => binding.prepare("DELETE FROM task_assignees WHERE task_id = ? AND project_id = ? AND kind = ? AND profile_id = ? AND EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ? AND mutation_token = ?)").bind(input.id, input.projectId, ref.kind, ref.profileId, input.id, input.projectId, input.token)),
    ...input.addedRefs.map((ref) => binding.prepare("INSERT INTO task_assignees (id, task_id, project_id, kind, profile_id) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ? AND mutation_token = ?)").bind(crypto.randomUUID(), input.id, input.projectId, ref.kind, ref.profileId, input.id, input.projectId, input.token)),
  ];
  const result = await binding.batch(statements);
  return Boolean(result[0].results?.length);
}

/**
 * Borra una tarea con revisión y guardas vigentes.
 * @param input - Identificador, revisión y guardas de autorización.
 * @returns `true` si la tarea existía en esa revisión y se borró.
 */
export async function deleteTaskRow(input: {
  id: string;
  projectId: string;
  revision: number;
  authGuard: SQL;
  ownGuard: SQL;
}): Promise<boolean> {
  const [deleted] = await getDb().delete(tasks).where(and(
    eq(tasks.id, input.id),
    eq(tasks.revision, input.revision),
    eq(tasks.projectId, input.projectId),
    input.authGuard,
    input.ownGuard,
  )).returning({ id: tasks.id });
  return Boolean(deleted);
}

/**
 * Borra la pizarra asociada a una tarea.
 * @param projectId - Proyecto activo.
 * @param taskId - Identificador de la tarea.
 */
export async function deleteTaskBoardRow(projectId: string, taskId: string): Promise<void> {
  await getDb().delete(boards).where(and(
    eq(boards.projectId, projectId),
    eq(boards.ownerType, "task"),
    eq(boards.ownerId, taskId),
  ));
}
