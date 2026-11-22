import { env } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import { sameRefs, unassigned, unlinkedAssigneeText, validateRefs, type TaskAuthGuard, type TaskPermissions } from "./permissions";
import {
  createTaskWithRefs,
  deleteTaskBoardRow,
  deleteTaskRow,
  findTaskRow,
  updateTaskStatusRow,
  updateTaskWithRefs,
} from "./mutations-repository";
import { projectData } from "./queries";
import type { ProjectData, TaskRef, TaskRow, TaskUpdate, TaskWriteFields } from "./types";

/**
 * Mutaciones de tareas: permisos, validación de responsables, revisión
 * optimista y mensajes del contrato. El acceso D1 vive en
 * `mutations-repository.ts`.
 */

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
  const binding = env.DB;
  if (!binding) return failure(503, "Base de datos no disponible.");
  const id = crypto.randomUUID();
  try {
    const inserted = await createTaskWithRefs(binding, {
      id,
      projectId: input.projectId,
      user: input.user,
      memberId: input.memberId,
      value: input.value,
      refs: input.refs,
      assigneeText: unlinkedAssigneeText(input.refs, input.value.assignee),
      guard: input.auth,
    });
    if (!inserted) return failure(403, "Ya no tienes permiso para crear tareas.");
  } catch {
    return failure(409, "No se pudo crear la tarea. Comprueba que los responsables y el proyecto siguen disponibles.");
  }
  const created = await findTaskRow(id, input.projectId);
  return created ? { ok: true, value: created } : failure(409, "No se pudo crear la tarea. Comprueba que los responsables y el proyecto siguen disponibles.");
}

/**
 * Edita una tarea, cambia solo su estado o valida la revisión y sus responsables.
 * @param input - Tarea actual, cambios validados, permisos y guarda.
 * @returns La tarea actualizada con los datos para decorarla, o un error.
 */
export async function updateTask(input: UpdateTaskInput): Promise<MutationResult<UpdatedTask>> {
  const binding = env.DB;
  if (!binding) return failure(503, "Base de datos no disponible.");

  if (!("title" in input.changes)) {
    if (input.permissions.isStudent && (!input.permissions.own(input.currentRefs) || input.currentRefs.length !== 1)) {
      return failure(403, "Solo puedes editar tareas asignadas únicamente a ti.");
    }
    const ownGuard = input.permissions.isStudent
      ? sql`EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ${input.id} AND project_id = ${input.projectId} AND kind = 'student' AND profile_id = ${input.permissions.selfId}) AND (SELECT count(*) FROM task_assignees WHERE task_id = ${input.id} AND project_id = ${input.projectId}) = 1`
      : sql`1 = 1`;
    const updated = await updateTaskStatusRow({
      id: input.id,
      projectId: input.projectId,
      revision: input.revision,
      status: input.changes.status,
      authGuard: input.auth.guard,
      ownGuard,
    });
    return updated ? { ok: true, value: { task: updated, data: input.data } } : failure(409, "Esta tarea cambió en otra sesión.");
  }

  const value = input.changes;
  const imageUrl = value.imageUrl ?? input.current.imageUrl ?? "";
  const documentId = value.documentId === undefined ? input.current.documentId ?? null : value.documentId;
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
    if (claims && (value.title !== input.current.title || value.description !== input.current.description || imageUrl !== (input.current.imageUrl ?? "") || documentId !== (input.current.documentId ?? null) || value.dueDate !== input.current.dueDate || value.priority !== input.current.priority || value.status !== input.current.status)) {
      return failure(403, "Primero asígnate la tarea y guarda. Después podrás editar sus datos.");
    }
  }

  const removedRefs = input.currentRefs.filter((ref) => !nextRefs.some((next) => next.kind === ref.kind && next.profileId === ref.profileId));
  const addedRefs = nextRefs.filter((ref) => !input.currentRefs.some((current) => current.kind === ref.kind && current.profileId === ref.profileId));
  try {
    const updated = await updateTaskWithRefs(binding, {
      id: input.id,
      projectId: input.projectId,
      revision: input.revision,
      value,
      imageUrl,
      documentId,
      assigneeText: unlinkedAssigneeText(nextRefs, value.assignee),
      token: crypto.randomUUID(),
      currentRefs: input.currentRefs,
      removedRefs,
      addedRefs,
      guard: input.auth,
    });
    if (!updated) return failure(409, "Esta tarea cambió en otra sesión.");
    const task = await findTaskRow(input.id, input.projectId);
    return task ? { ok: true, value: { task, data: await projectData(input.projectId) } } : failure(409, "La tarea ya no está disponible.");
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
  if (input.permissions.isStudent && (!input.permissions.own(input.currentRefs) || input.currentRefs.length !== 1)) {
    return failure(403, "Solo puedes eliminar tareas asignadas únicamente a ti.");
  }
  const ownGuard = input.permissions.isStudent
    ? sql`EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ${input.id} AND project_id = ${input.projectId} AND kind = 'student' AND profile_id = ${input.permissions.selfId}) AND (SELECT count(*) FROM task_assignees WHERE task_id = ${input.id} AND project_id = ${input.projectId}) = 1`
    : sql`1 = 1`;
  const deleted = await deleteTaskRow({
    id: input.id,
    projectId: input.projectId,
    revision: input.revision,
    authGuard: input.auth.guard,
    ownGuard,
  });
  if (!deleted) return failure(409, "Esta tarea cambió en otra sesión.");
  await deleteTaskBoardRow(input.projectId, input.id);
  return { ok: true, value: { id: input.id } };
}
