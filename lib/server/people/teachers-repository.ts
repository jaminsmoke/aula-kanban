import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectMembers, teachers } from "../../../db/schema";

/**
 * Acceso D1 de las fichas de profesorado y de su invitación de membresía.
 *
 * Las reglas de visibilidad, validación y mensajes viven en `teachers.ts`;
 * este módulo solo lee, inserta y traslada filas al histórico.
 */

/** Fila de `teachers`. */
export type TeacherRow = typeof teachers.$inferSelect;

/** Valores persistibles de una ficha de profesor. */
export type TeacherRowInput = {
  name: string;
  displayName: string;
  role: string;
  activities: string;
  aiHelp: string;
  id: string;
};

/**
 * Lista las fichas de un proyecto por nombre e identificador.
 * @param projectId - Proyecto del que se leen las fichas.
 * @returns Las filas de `teachers`.
 */
export async function listTeacherRows(projectId: string): Promise<TeacherRow[]> {
  return getDb().select().from(teachers).where(eq(teachers.projectId, projectId)).orderBy(asc(teachers.name), asc(teachers.id));
}

/**
 * Busca la ficha de un profesor por identificador.
 * @param projectId - Proyecto de la ficha.
 * @param id - Identificador de la ficha.
 * @returns La fila o `null`.
 */
export async function findTeacherRow(projectId: string, id: string): Promise<TeacherRow | null> {
  const [row] = await getDb()
    .select()
    .from(teachers)
    .where(and(eq(teachers.id, id), eq(teachers.projectId, projectId)));
  return row ?? null;
}

/**
 * Crea la ficha y, si hay correo, su invitación pendiente en el mismo lote.
 * @param projectId - Proyecto de la ficha.
 * @param values - Valores de la ficha, incluido su identificador.
 * @param email - Correo a invitar; vacío crea la ficha sin cuenta.
 * @returns La ficha creada o `null` si el lote no devolvió fila.
 */
export async function insertTeacherRow(projectId: string, values: TeacherRowInput, email: string): Promise<TeacherRow | null> {
  const db = getDb();
  const insert = db.insert(teachers).values({ ...values, projectId }).returning();
  const [created] = email
    ? (
        await db.batch([
          insert,
          db.insert(projectMembers).values({ id: crypto.randomUUID(), projectId, email, role: "teacher", teacherId: values.id, status: "pending" }).returning(),
        ])
      )[0]
    : await insert;
  return created ?? null;
}

/**
 * Traslada la ficha al histórico de 30 días y retira su membresía.
 * @param db - Binding D1 de la instancia.
 * @param projectId - Proyecto de la ficha.
 * @param id - Identificador de la ficha.
 * @param revision - Revisión esperada.
 * @returns `true` si la ficha existía con esa revisión y se trasladó.
 */
export async function deleteTeacherWithHistory(
  db: D1Database,
  projectId: string,
  id: string,
  revision: number,
): Promise<boolean> {
  const deletedAt = Date.now();
  const result = await db.batch([
    db.prepare(`INSERT INTO deleted_teachers (id, project_id, name, display_name, user_id, deleted_at)
      SELECT t.id, t.project_id, t.name, t.display_name,
        (SELECT m.user_id FROM project_members m WHERE m.project_id = t.project_id AND m.teacher_id = t.id), ?
      FROM teachers t WHERE t.id = ? AND t.project_id = ? AND t.revision = ?
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, display_name = excluded.display_name, user_id = excluded.user_id, deleted_at = excluded.deleted_at
      RETURNING id`).bind(deletedAt, id, projectId, revision),
    db.prepare("DELETE FROM project_members WHERE project_id = ? AND teacher_id = ? AND EXISTS (SELECT 1 FROM deleted_teachers WHERE id = ? AND deleted_at = ?)").bind(projectId, id, id, deletedAt),
    db.prepare("DELETE FROM teachers WHERE id = ? AND project_id = ? AND EXISTS (SELECT 1 FROM deleted_teachers WHERE id = ? AND deleted_at = ?) RETURNING id").bind(id, projectId, id, deletedAt),
  ]);
  return Boolean(result[0].results?.length);
}
