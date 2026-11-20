import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectMembers, students, teachers } from "../../../db/schema";

/**
 * Acceso D1 de miembros e invitaciones de un proyecto.
 *
 * Las reglas de permiso, la validación de rol/ficha y los mensajes del
 * contrato viven en `members.ts`; este módulo solo lee y escribe filas.
 */

/** Fila completa de `project_members`, incluido `userId`. */
export type ProjectMemberRow = typeof projectMembers.$inferSelect;

/**
 * Lista los miembros del proyecto por correo.
 * @param projectId - Proyecto del que se leen los miembros.
 * @returns Las filas de `project_members` ordenadas por correo.
 */
export async function listProjectMemberRows(projectId: string): Promise<ProjectMemberRow[]> {
  return getDb()
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId))
    .orderBy(asc(projectMembers.email));
}

/**
 * Busca la ficha de alumno vinculable de un proyecto.
 * @param projectId - Proyecto de la ficha.
 * @param section - Sección de la ficha.
 * @returns La ficha activa o `null`.
 */
export async function findStudentRow(projectId: string, section: string) {
  const [row] = await getDb()
    .select()
    .from(students)
    .where(and(eq(students.section, section), eq(students.projectId, projectId), eq(students.deleted, 0)));
  return row ?? null;
}

/**
 * Busca la ficha de profesor vinculable de un proyecto.
 * @param projectId - Proyecto de la ficha.
 * @param teacherId - Identificador de la ficha.
 * @returns La ficha o `null`.
 */
export async function findTeacherRow(projectId: string, teacherId: string) {
  const [row] = await getDb()
    .select()
    .from(teachers)
    .where(and(eq(teachers.id, teacherId), eq(teachers.projectId, projectId)));
  return row ?? null;
}

/**
 * Busca una invitación o membresía por correo.
 * @param projectId - Proyecto de la membresía.
 * @param email - Correo normalizado.
 * @returns La fila o `null`.
 */
export async function findMemberRowByEmail(projectId: string, email: string): Promise<ProjectMemberRow | null> {
  const [row] = await getDb()
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.email, email)));
  return row ?? null;
}

/**
 * Busca la membresía vinculada a una ficha de alumno.
 * @param projectId - Proyecto de la membresía.
 * @param section - Sección de la ficha.
 * @returns La fila o `null`.
 */
export async function findMemberRowByStudentSection(projectId: string, section: string): Promise<ProjectMemberRow | null> {
  const [row] = await getDb()
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.studentSection, section)));
  return row ?? null;
}

/**
 * Busca la membresía vinculada a una ficha de profesor.
 * @param projectId - Proyecto de la membresía.
 * @param teacherId - Identificador de la ficha.
 * @returns La fila o `null`.
 */
export async function findMemberRowByTeacherId(projectId: string, teacherId: string): Promise<ProjectMemberRow | null> {
  const [row] = await getDb()
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.teacherId, teacherId)));
  return row ?? null;
}

/**
 * Busca un miembro por identificador dentro del proyecto.
 * @param projectId - Proyecto de la membresía.
 * @param id - Identificador del miembro.
 * @returns La fila o `null`.
 */
export async function findProjectMemberRow(projectId: string, id: string): Promise<ProjectMemberRow | null> {
  const [row] = await getDb()
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.id, id), eq(projectMembers.projectId, projectId)));
  return row ?? null;
}

/**
 * Cambia el correo de una invitación y la devuelve a `pending`.
 * @param projectId - Proyecto de la membresía.
 * @param id - Identificador del miembro.
 * @param previousEmail - Correo con el que se leyó la fila.
 * @param email - Correo nuevo.
 * @returns La fila actualizada o `null` si cambió entre lectura y escritura.
 */
export async function updateMemberInvitationEmailRow(
  projectId: string,
  id: string,
  previousEmail: string,
  email: string,
): Promise<ProjectMemberRow | null> {
  const [updated] = await getDb()
    .update(projectMembers)
    .set({ email, status: "pending", userId: null })
    .where(and(eq(projectMembers.id, id), eq(projectMembers.projectId, projectId), eq(projectMembers.email, previousEmail)))
    .returning();
  return updated ?? null;
}

/**
 * Crea una invitación pendiente.
 * @param values - Datos de la membresía.
 * @returns La fila creada o `null` si no se devolvió.
 */
export async function insertMemberRow(values: typeof projectMembers.$inferInsert): Promise<ProjectMemberRow | null> {
  const [created] = await getDb().insert(projectMembers).values(values).returning();
  return created ?? null;
}

/**
 * Borra un miembro del proyecto.
 * @param projectId - Proyecto de la membresía.
 * @param id - Identificador del miembro.
 * @returns El identificador borrado o `null` si ya no existía.
 */
export async function deleteMemberRow(projectId: string, id: string): Promise<string | null> {
  const [deleted] = await getDb()
    .delete(projectMembers)
    .where(and(eq(projectMembers.id, id), eq(projectMembers.projectId, projectId)))
    .returning({ id: projectMembers.id });
  return deleted?.id ?? null;
}
