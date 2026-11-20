import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectMembers, students } from "../../../db/schema";

/**
 * Acceso D1 de las fichas de alumnado y de su invitación de membresía.
 *
 * Las reglas de visibilidad, validación y mensajes viven en `students.ts`;
 * este módulo solo lee, inserta y traslada filas al histórico.
 */

/** Fila de `students`. */
export type StudentRow = typeof students.$inferSelect;

/** Valores persistibles de una ficha de alumno. */
export type StudentRowInput = {
  name: string;
  displayName: string;
  role: string;
  activities: string;
  aiHelp: string;
  section: string;
};

/**
 * Lista las fichas de un proyecto por sección, incluidas las dadas de baja.
 * @param projectId - Proyecto del que se leen las fichas.
 * @returns Las filas de `students`.
 */
export async function listStudentRows(projectId: string): Promise<StudentRow[]> {
  return getDb().select().from(students).where(eq(students.projectId, projectId)).orderBy(asc(students.section));
}

/**
 * Busca la ficha de un alumno por sección.
 * @param projectId - Proyecto de la ficha.
 * @param section - Sección de la ficha.
 * @returns La fila o `null`.
 */
export async function findStudentRow(projectId: string, section: string): Promise<StudentRow | null> {
  const [row] = await getDb()
    .select()
    .from(students)
    .where(and(eq(students.section, section), eq(students.projectId, projectId)));
  return row ?? null;
}

/**
 * Crea la ficha y, si hay correo, su invitación pendiente en el mismo lote.
 * @param projectId - Proyecto de la ficha.
 * @param values - Valores de la ficha.
 * @param email - Correo a invitar; vacío crea la ficha sin cuenta.
 * @returns La ficha creada o `null` si el lote no devolvió fila.
 */
export async function insertStudentRow(projectId: string, values: StudentRowInput, email: string): Promise<StudentRow | null> {
  const db = getDb();
  const insert = db.insert(students).values({ ...values, projectId }).returning();
  const [created] = email
    ? (
        await db.batch([
          insert,
          db.insert(projectMembers).values({ id: crypto.randomUUID(), projectId, email, role: "student", studentSection: values.section, status: "pending" }).returning(),
        ])
      )[0]
    : await insert;
  return created ?? null;
}

/**
 * Traslada la ficha al histórico de 30 días y retira su membresía.
 * @param db - Binding D1 de la instancia.
 * @param projectId - Proyecto de la ficha.
 * @param section - Sección de la ficha.
 * @param revision - Revisión esperada.
 * @returns `true` si la ficha existía con esa revisión y se trasladó.
 */
export async function deleteStudentWithHistory(
  db: D1Database,
  projectId: string,
  section: string,
  revision: number,
): Promise<boolean> {
  const deletedAt = Date.now();
  const result = await db.batch([
    db.prepare(`INSERT INTO deleted_students (section, project_id, name, display_name, user_id, deleted_at)
      SELECT s.section, s.project_id, COALESCE(NULLIF(s.name, ''), s.display_name), s.display_name,
        (SELECT m.user_id FROM project_members m WHERE m.project_id = s.project_id AND m.student_section = s.section), ?
      FROM students s WHERE s.section = ? AND s.project_id = ? AND s.revision = ? AND s.deleted = 0
      ON CONFLICT(section) DO UPDATE SET name = excluded.name, display_name = excluded.display_name, user_id = excluded.user_id, deleted_at = excluded.deleted_at
      RETURNING section`).bind(deletedAt, section, projectId, revision),
    db.prepare("DELETE FROM project_members WHERE project_id = ? AND student_section = ? AND EXISTS (SELECT 1 FROM deleted_students WHERE section = ? AND deleted_at = ?)").bind(projectId, section, section, deletedAt),
    db.prepare("DELETE FROM students WHERE section = ? AND project_id = ? AND EXISTS (SELECT 1 FROM deleted_students WHERE section = ? AND deleted_at = ?) RETURNING section").bind(section, projectId, section, deletedAt),
  ]);
  return Boolean(result[0].results?.length);
}
