import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { boards, tasks } from "../../../db/schema";
import { sameRefs, unassigned, unlinkedAssigneeText, validateRefs, type TaskAuthGuard, type TaskPermissions } from "./permissions";
import { projectData } from "./queries";
import type { ProjectData, TaskRef, TaskRow, TaskUpdate, TaskWriteFields } from "./types";

/** Error de negocio devuelto por una mutación. */
export type MutationFailure = { ok: false; status: number; message: string };

/** Resultado correcto de una mutación. */
export type MutationSuccess<T> = { ok: true; value: T };

/** Resultado de una mutación de tareas. */
export type MutationResult<T> = MutationSuccess<T> | MutationFailure;

/** Entrada para crear una tarea. */
export type CreateTaskInput = {
  projectId: string;
  user: { userId: string; displayName: string };
  auth: TaskAuthGuard;
  value: TaskWriteFields;
  refs: TaskRef[];
  memberId: string | null;
};

/** Entrada para editar una tarea o cambiar solo su estado. */
export type UpdateTaskInput = {
  projectId: string;
  auth: TaskAuthGuard;
  data: ProjectData;
  permissions: TaskPermissions;
  id: string;
  revision: number;
  current: TaskRow;
  currentRefs: TaskRef[];
  changes: TaskUpdate;
};

/** Entrada para borrar una tarea. */
export type DeleteTaskInput = {
  projectId: string;
  auth: TaskAuthGuard;
  permissions: TaskPermissions;
  id: string;
  revision: number;
  currentRefs: TaskRef[];
};

/** Resultado de una tarea editada, con los datos necesarios para decorarla. */
export type UpdatedTask = { task: TaskRow; data: ProjectData };

const failure = (status: number, message: string): MutationFailure => ({ ok: false, status, message });

/**
 * Crea la tarea, la identidad del creador y sus responsables en un batch.
 * @param input - Datos validados, usuario, guarda y responsables.
 * @returns La fila creada o un error de negocio.
 */
export async function createTask(input: CreateTaskInput): Promise<MutationResult<TaskRow>> {
  const db = getDb();
  const binding = env.DB;
  if (!binding) return failure(503, "Base de datos no disponible.");
  const id = crypto.randomUUID();
  const statements = [
    binding.prepare(`INSERT INTO tasks (id, project_id, title, description, image_url, assignee, due_date, priority, status, created_at, revision, creator_user_id, creator_member_id, creator_name) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ? WHERE ${input.auth.sql} RETURNING id`).bind(id, input.projectId, input.value.title, input.value.description, input.value.imageUrl ?? "", unlinkedAssigneeText(input.refs, input.value.assignee), input.value.dueDate, input.value.priority, input.value.status, Date.now(), input.user.userId, input.memberId, input.user.displayName, ...input.auth.args),
    binding.prepare("INSERT INTO user_identities (id, display_name) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ?) ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name").bind(input.user.userId, input.user.displayName, id, input.projectId),
    ...input.refs.map((ref) => binding.prepare("INSERT INTO task_assignees (id, task_id, project_id, kind, profile_id) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ?)").bind(crypto.randomUUID(), id, input.projectId, ref.kind, ref.profileId, id, input.projectId)),
  ];
  try {
    const result = await binding.batch(statements);
    if (!result[0].results?.length) return failure(403, "Ya no tienes permiso para crear tareas.");
  } catch {
    return failure(409, "No se pudo crear la tarea. Comprueba que los responsables y el proyecto siguen disponibles.");
  }
  const [created] = await db.select().from(tasks).where(eq(tasks.id, id));
  return created ? { ok: true, value: created } : failure(409, "No se pudo crear la tarea. Comprueba que los responsables y el proyecto siguen disponibles.");
}

/**
 * Edita una tarea, cambia solo su estado o valida la revisión y sus responsables.
 * @param input - Tarea actual, cambios validados, permisos y guarda.
 * @returns La tarea actualizada con los datos para decorarla, o un error.
 */
export async function updateTask(input: UpdateTaskInput): Promise<MutationResult<UpdatedTask>> {
  const db = getDb();
  const binding = env.DB;
  if (!binding) return failure(503, "Base de datos no disponible.");
  const matches = and(eq(tasks.id, input.id), eq(tasks.revision, input.revision), eq(tasks.projectId, input.projectId), input.auth.guard);

  if (!("title" in input.changes)) {
    if (input.permissions.isStudent && (!input.permissions.own(input.currentRefs) || input.currentRefs.length !== 1)) {
      return failure(403, "Solo puedes editar tareas asignadas únicamente a ti.");
    }
    const ownGuard = input.permissions.isStudent
      ? sql`EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ${input.id} AND project_id = ${input.projectId} AND kind = 'student' AND profile_id = ${input.permissions.selfId}) AND (SELECT count(*) FROM task_assignees WHERE task_id = ${input.id} AND project_id = ${input.projectId}) = 1`
      : sql`1 = 1`;
    const [updated] = await db.update(tasks).set({ status: input.changes.status, revision: sql`${tasks.revision} + 1` }).where(and(matches, ownGuard)).returning();
    return updated ? { ok: true, value: { task: updated, data: input.data } } : failure(409, "Esta tarea cambió en otra sesión.");
  }

  const value = input.changes;
  const imageUrl = value.imageUrl ?? input.current.imageUrl ?? "";
  // A legacy client that omits assignees preserves existing references; it cannot silently take ownership.
  const nextRefs = value.assignees ?? input.currentRefs;
  if (!validateRefs(nextRefs, input.data, input.currentRefs)) return failure(400, "Selecciona responsables válidos de este proyecto.");
  if (input.permissions.isStudent) {
    const wasOwn = input.currentRefs.length === 1 && input.permissions.own(input.currentRefs);
    const claims = input.currentRefs.length === 0 && unassigned(input.current.assignee) && input.permissions.own(nextRefs);
    if (!wasOwn && !claims) return failure(403, "Solo puedes editar tus tareas o asignarte una tarea sin responsable.");
    const otherCurrent = input.currentRefs.filter((ref) => !(ref.kind === "student" && ref.profileId === input.permissions.selfId));
    const otherNext = nextRefs.filter((ref) => !(ref.kind === "student" && ref.profileId === input.permissions.selfId));
    if (!sameRefs(otherCurrent, otherNext) || (!nextRefs.length && !unassigned(value.assignee))) return failure(403, "No puedes cambiar la asignación de otras personas.");
    if (claims && (value.title !== input.current.title || value.description !== input.current.description || imageUrl !== (input.current.imageUrl ?? "") || value.dueDate !== input.current.dueDate || value.priority !== input.current.priority || value.status !== input.current.status)) {
      return failure(403, "Primero asígnate la tarea y guarda. Después podrás editar sus datos.");
    }
  }

  const token = crypto.randomUUID();
  const referenceGuard = input.currentRefs.map(() => "AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ? AND project_id = ? AND kind = ? AND profile_id = ?)").join(" ");
  const referenceArgs = input.currentRefs.flatMap((ref) => [input.id, input.projectId, ref.kind, ref.profileId]);
  const removedRefs = input.currentRefs.filter((ref) => !nextRefs.some((next) => next.kind === ref.kind && next.profileId === ref.profileId));
  const addedRefs = nextRefs.filter((ref) => !input.currentRefs.some((current) => current.kind === ref.kind && current.profileId === ref.profileId));
  const statements = [
    binding.prepare(`UPDATE tasks SET title = ?, description = ?, image_url = ?, assignee = ?, due_date = ?, priority = ?, status = ?, revision = revision + 1, mutation_token = ? WHERE id = ? AND project_id = ? AND revision = ? AND ${input.auth.sql} AND (SELECT count(*) FROM task_assignees WHERE task_id = ? AND project_id = ?) = ? ${referenceGuard} RETURNING id`).bind(value.title, value.description, imageUrl, unlinkedAssigneeText(nextRefs, value.assignee), value.dueDate, value.priority, value.status, token, input.id, input.projectId, input.revision, ...input.auth.args, input.id, input.projectId, input.currentRefs.length, ...referenceArgs),
    ...removedRefs.map((ref) => binding.prepare("DELETE FROM task_assignees WHERE task_id = ? AND project_id = ? AND kind = ? AND profile_id = ? AND EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ? AND mutation_token = ?)").bind(input.id, input.projectId, ref.kind, ref.profileId, input.id, input.projectId, token)),
    ...addedRefs.map((ref) => binding.prepare("INSERT INTO task_assignees (id, task_id, project_id, kind, profile_id) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ? AND mutation_token = ?)").bind(crypto.randomUUID(), input.id, input.projectId, ref.kind, ref.profileId, input.id, input.projectId, token)),
  ];
  try {
    const result = await binding.batch(statements);
    if (!result[0].results?.length) return failure(409, "Esta tarea cambió en otra sesión.");
    const [updated] = await db.select().from(tasks).where(and(eq(tasks.id, input.id), eq(tasks.projectId, input.projectId)));
    return updated ? { ok: true, value: { task: updated, data: await projectData(input.projectId) } } : failure(409, "La tarea ya no está disponible.");
  } catch {
    return failure(409, "No se pudieron guardar los responsables. Comprueba que sus fichas siguen disponibles.");
  }
}

/**
 * Borra una tarea y su pizarra asociada tras comprobar revisión y permisos.
 * @param input - Identificador, revisión, permisos y guarda.
 * @returns El identificador borrado o un error de negocio.
 */
export async function deleteTask(input: DeleteTaskInput): Promise<MutationResult<{ id: string }>> {
  const db = getDb();
  const matches = and(eq(tasks.id, input.id), eq(tasks.revision, input.revision), eq(tasks.projectId, input.projectId), input.auth.guard);
  if (input.permissions.isStudent && (!input.permissions.own(input.currentRefs) || input.currentRefs.length !== 1)) {
    return failure(403, "Solo puedes eliminar tareas asignadas únicamente a ti.");
  }
  const ownGuard = input.permissions.isStudent
    ? sql`EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ${input.id} AND project_id = ${input.projectId} AND kind = 'student' AND profile_id = ${input.permissions.selfId}) AND (SELECT count(*) FROM task_assignees WHERE task_id = ${input.id} AND project_id = ${input.projectId}) = 1`
    : sql`1 = 1`;
  const [deleted] = await db.delete(tasks).where(and(matches, ownGuard)).returning({ id: tasks.id });
  if (!deleted) return failure(409, "Esta tarea cambió en otra sesión.");
  await db.delete(boards).where(and(eq(boards.projectId, input.projectId), eq(boards.ownerType, "task"), eq(boards.ownerId, input.id)));
  return { ok: true, value: deleted };
}
