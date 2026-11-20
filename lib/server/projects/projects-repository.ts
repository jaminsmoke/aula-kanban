import { count, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { appDocuments, boards, deletedStudents, deletedTeachers, projectMembers, projects, students, taskAssignees, tasks, teachers, uploads } from "../../../db/schema";
import { DEMO_PROJECT_ID } from "../../domain/demo";
import type { ProjectRow } from "./project-access";

/**
 * Acceso D1 de proyectos: alta, lectura, recuento y borrado en lote.
 *
 * Las reglas de permiso, la validación del cuerpo y los mensajes del contrato
 * viven en `projects.ts`; aquí solo se ejecuta la persistencia.
 */

/** Contenido de un proyecto que se perderá al eliminarlo. */
export type ProjectDeletionSummary = { tareas: number; fichas: number; miembros: number; pizarras: number; documentos: number; archivos: number };

/**
 * Suma el total de una consulta de recuento.
 * @param filas - Filas devueltas por `count()`.
 * @returns El total, o 0 si no hay filas.
 */
function total(filas: Array<{ value: number }>): number {
  return filas[0]?.value ?? 0;
}

/**
 * Inserta un proyecto si su identificador está libre.
 * @param values - Identificador, nombre y fecha de alta.
 * @returns La fila creada o `null` si el identificador ya existía.
 */
export async function insertProjectRow(values: typeof projects.$inferInsert): Promise<ProjectRow | null> {
  const [created] = await getDb().insert(projects).values(values).onConflictDoNothing().returning();
  return created ?? null;
}

/**
 * Busca un proyecto por identificador canónico.
 * @param projectId - Identificador del proyecto.
 * @returns La fila del proyecto o `null`.
 */
export async function findProjectRow(projectId: string): Promise<ProjectRow | null> {
  const [project] = await getDb().select().from(projects).where(eq(projects.id, projectId));
  return project ?? null;
}

/**
 * Lee el proyecto ficticio de la demo.
 * @returns La fila del proyecto demo o `null` si no está sembrado.
 */
export async function findDemoProjectRow(): Promise<ProjectRow | null> {
  return findProjectRow(DEMO_PROJECT_ID);
}

/**
 * Lista todos los proyectos en el orden de la tabla.
 * @returns Las filas de `projects`.
 */
export async function listProjectRows(): Promise<ProjectRow[]> {
  return getDb().select().from(projects);
}

/**
 * Cuenta el contenido que se borrará con un proyecto.
 * @param projectId - Proyecto del que se cuenta el contenido.
 * @returns Tareas, fichas, miembros, pizarras, documentos y archivos.
 */
export async function countProjectContent(projectId: string): Promise<ProjectDeletionSummary> {
  const db = getDb();
  const [tareas, alumnos, profesores, miembros, pizarras, documentos, archivos] = await Promise.all([
    db.select({ value: count() }).from(tasks).where(eq(tasks.projectId, projectId)),
    db.select({ value: count() }).from(students).where(eq(students.projectId, projectId)),
    db.select({ value: count() }).from(teachers).where(eq(teachers.projectId, projectId)),
    db.select({ value: count() }).from(projectMembers).where(eq(projectMembers.projectId, projectId)),
    db.select({ value: count() }).from(boards).where(eq(boards.projectId, projectId)),
    db.select({ value: count() }).from(appDocuments).where(eq(appDocuments.projectId, projectId)),
    db.select({ value: count() }).from(uploads).where(eq(uploads.projectId, projectId)),
  ]);
  return {
    tareas: total(tareas),
    fichas: total(alumnos) + total(profesores),
    miembros: total(miembros),
    pizarras: total(pizarras),
    documentos: total(documentos),
    archivos: total(archivos),
  };
}

/**
 * Borra un proyecto y su contenido en un único lote atómico.
 * Los objetos R2 se limpian después, desde el servicio.
 * @param projectId - Proyecto que se elimina.
 * @returns `true` si el proyecto existía y se borró.
 */
export async function deleteProjectRows(projectId: string): Promise<boolean> {
  const db = getDb();
  const [, , , , , , , , , result] = await db.batch([
    db.delete(boards).where(eq(boards.projectId, projectId)),
    db.delete(appDocuments).where(eq(appDocuments.projectId, projectId)),
    db.delete(taskAssignees).where(eq(taskAssignees.projectId, projectId)),
    db.delete(tasks).where(eq(tasks.projectId, projectId)),
    db.delete(projectMembers).where(eq(projectMembers.projectId, projectId)),
    db.delete(students).where(eq(students.projectId, projectId)),
    db.delete(teachers).where(eq(teachers.projectId, projectId)),
    db.delete(deletedStudents).where(eq(deletedStudents.projectId, projectId)),
    db.delete(deletedTeachers).where(eq(deletedTeachers.projectId, projectId)),
    db.delete(projects).where(eq(projects.id, projectId)),
  ]);
  return Boolean(result.meta.changes);
}
