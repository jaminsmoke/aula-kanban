import { sql, type SQL } from "drizzle-orm";
import { normalizeName } from "../../domain/assignments";
import type { ProjectData, TaskRef } from "./types";

/** Rol del actor dentro del proyecto. */
export type TaskAccess = { role: "owner" | "admin" | "teacher" | "student" | "guest"; studentSection: string | null };

/** Guarda SQL de autorización de tareas y sus argumentos. */
export type TaskAuthGuard = { sql: string; args: string[]; guard: SQL };

/**
 * Indica si un texto de responsable representa «sin asignar».
 * @param name - Texto del responsable.
 * @returns `true` si está vacío o es «por definir».
 */
export function unassigned(name: string): boolean {
  return !name.trim() || normalizeName(name) === "por definir";
}

/**
 * Valida que las referencias sean únicas y existan en el proyecto. Las
 * referencias ya guardadas pueden apuntar a una ficha eliminada.
 * @param refs - Referencias propuestas.
 * @param data - Fichas activas y eliminadas del proyecto.
 * @param allowed - Referencias antiguas que se permiten conservar.
 * @returns `true` cuando todas las referencias son válidas.
 */
export function validateRefs(refs: TaskRef[], data: ProjectData, allowed: TaskRef[] = []): boolean {
  const unique = new Set(refs.map((ref) => `${ref.kind}:${ref.profileId}`));
  const exists = (ref: TaskRef) => ref.kind === "student"
    ? data.profiles.some((profile) => profile.section === ref.profileId)
    : data.staff.some((profile) => profile.id === ref.profileId);
  return unique.size === refs.length && refs.every((ref) => exists(ref) || allowed.some((other) => other.kind === ref.kind && other.profileId === ref.profileId));
}

/**
 * Compara dos listas de referencias sin depender del orden.
 * @param a - Primera lista.
 * @param b - Segunda lista.
 * @returns `true` cuando contienen las mismas referencias.
 */
export function sameRefs(a: TaskRef[], b: TaskRef[]): boolean {
  return a.length === b.length && a.every((ref) => b.some((other) => ref.kind === other.kind && ref.profileId === other.profileId));
}

/**
 * Decide el texto heredado de `assignee`: solo se conserva si no hay
 * responsables vinculados.
 * @param refs - Referencias vinculadas.
 * @param fallback - Texto heredado.
 * @returns El texto heredado o una cadena vacía.
 */
export function unlinkedAssigneeText(refs: TaskRef[], fallback: string): string {
  return refs.length ? "" : fallback;
}

/**
 * Motivo por el que el rol no puede mutar tareas del proyecto.
 * @param access - Rol y ficha del actor.
 * @returns El estado y el mensaje del rechazo, o `null` si puede escribir.
 */
export function taskWriteDenial(access: TaskAccess): { status: number; message: string } | null {
  return access.role === "guest"
    ? { status: 403, message: "Las cuentas invitadas solo pueden consultar el proyecto." }
    : null;
}

/**
 * Construye la guarda SQL que confirma que la cuenta sigue teniendo permiso
 * sobre el proyecto en el momento de la escritura.
 * @param role - Rol del actor en el proyecto.
 * @param userId - Identificador de la cuenta.
 * @param projectId - Proyecto activo.
 * @returns SQL literal, argumentos y versión Drizzle de la guarda.
 */
export function taskAuthGuard(role: TaskAccess["role"], userId: string, projectId: string): TaskAuthGuard {
  if (role === "owner") return { sql: "1 = 1", args: [], guard: sql`1 = 1` };
  if (role === "admin") {
    return {
      sql: "EXISTS (SELECT 1 FROM administrators_unified WHERE user_id = ?)",
      args: [userId],
      guard: sql`EXISTS (SELECT 1 FROM administrators_unified WHERE user_id = ${userId})`,
    };
  }
  return {
    sql: "EXISTS (SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND status = 'active' AND role = ?)",
    args: [projectId, userId, role],
    guard: sql`EXISTS (SELECT 1 FROM project_members WHERE project_id = ${projectId} AND user_id = ${userId} AND status = 'active' AND role = ${role})`,
  };
}

export type TaskPermissions = ReturnType<typeof createTaskPermissions>;

/**
 * Crea las reglas de asignación de un actor dentro del proyecto.
 * @param access - Rol y ficha de alumno del actor.
 * @returns Predicados para saber si una tarea es suya o solo puede asignarse a sí mismo.
 */
export function createTaskPermissions(access: TaskAccess) {
  const isStudent = access.role === "student";
  const selfId = access.studentSection;
  const own = (refs: TaskRef[]) => Boolean(selfId && refs.some((ref) => ref.kind === "student" && ref.profileId === selfId));
  const onlySelfOrNone = (refs: TaskRef[]) => refs.length === 0 || (refs.length === 1 && own(refs));
  return { isStudent, selfId, own, onlySelfOrNone };
}
