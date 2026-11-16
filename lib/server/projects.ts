import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { appDocuments, boards, deletedStudents, deletedTeachers, projectMembers, projects, students, taskAssignees, tasks, teachers, uploads } from "../../db/schema";
import { DEMO_PROJECT_ID, isDemoUser } from "../domain/demo";
import type { ChatGPTUser } from "./auth";
import { globalRoleForUser, isAdministrator, isOwner, memberAccess, type Access, type ProjectRow } from "./project-access";
import { PROJECT_FAILURE_MESSAGES } from "./project-contract";
import { deleteProjectUploads } from "./storage";

/**
 * Proyectos visibles para la cuenta, con su rol.
 *
 * Extrae la lista que antes solo vivía en `reads.ts` (MCP) y en la ruta GET
 * de `/api/projects`: el rol global (propietario/administrador) se resuelve
 * una sola vez y el resto va por membresía, sin repetir `isOwner` e
 * `isAdministrator` por proyecto. La ruta GET añade sus efectos propios
 * (sincronizar identidad, limpiar subidas huérfanas) y mantiene su versión.
 */

/** Proyecto con el acceso de la cuenta. */
export type ProjectWithAccess = { project: ProjectRow; access: Access };

/** Resultado de crear un proyecto: el proyecto o el fallo del contrato. */
export type CreateProjectResult =
  | { ok: true; proyecto: ProjectRow; creado: boolean }
  | { ok: false; status: number; message: string };

/**
 * Crea un proyecto nuevo; solo el propietario o la administración.
 * @param user - Cuenta autenticada.
 * @param body - Identificador y nombre del proyecto.
 * @returns El proyecto creado o el fallo del contrato.
 */
export async function createProject(user: ChatGPTUser, body: unknown): Promise<CreateProjectResult> {
  if (!((await isOwner(user)) || (await isAdministrator(user)))) {
    return { ok: false, status: 403, message: "Solo el propietario o un administrador pueden crear proyectos." };
  }
  const parsed = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) }).safeParse(body);
  if (!parsed.success) return { ok: false, status: 400, message: "Escribe un nombre de hasta 80 caracteres." };
  const db = getDb();
  const [created] = await db.insert(projects).values({ ...parsed.data, createdAt: Date.now() }).onConflictDoNothing().returning();
  if (created) return { ok: true, proyecto: created, creado: true };
  const [existing] = await db.select().from(projects).where(eq(projects.id, parsed.data.id));
  if (existing?.name === parsed.data.name) return { ok: true, proyecto: existing, creado: false };
  return { ok: false, status: 409, message: "No se pudo crear el proyecto. Vuelve a intentarlo." };
}

/** Contenido de un proyecto que se perderá al eliminarlo. */
export type ProjectDeletionSummary = { tareas: number; fichas: number; miembros: number; pizarras: number; documentos: number; archivos: number };

/** Resultado del aviso previo al borrado: el proyecto y su recuento. */
export type ProjectDeletionInfo =
  | { ok: true; proyecto: ProjectRow; resumen: ProjectDeletionSummary }
  | { ok: false; status: number; message: string };

/** Resultado de eliminar un proyecto. */
export type DeleteProjectResult =
  | { ok: true; id: string; deleted: boolean }
  | { ok: false; status: number; message: string };

/**
 * Suma el total de una consulta de recuento.
 * @param filas - Filas devueltas por `count()`.
 * @returns El total, o 0 si no hay filas.
 */
function total(filas: Array<{ value: number }>): number {
  return filas[0]?.value ?? 0;
}

/**
 * Resume lo que se borrará con un proyecto, sin borrar nada.
 * @param user - Cuenta autenticada.
 * @param projectId - Proyecto que se quiere eliminar.
 * @returns El proyecto con su recuento, 403 sin permiso o 404 si no existe.
 */
export async function projectDeletionInfo(user: ChatGPTUser, projectId: string): Promise<ProjectDeletionInfo> {
  if (!((await isOwner(user)) || (await isAdministrator(user)))) {
    return { ok: false, status: 403, message: "Solo el propietario o un administrador pueden eliminar proyectos." };
  }
  const db = getDb();
  const [proyecto] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!proyecto) return { ok: false, status: 404, message: PROJECT_FAILURE_MESSAGES.not_found };
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
    ok: true,
    proyecto,
    resumen: {
      tareas: total(tareas),
      fichas: total(alumnos) + total(profesores),
      miembros: total(miembros),
      pizarras: total(pizarras),
      documentos: total(documentos),
      archivos: total(archivos),
    },
  };
}

/**
 * Elimina un proyecto con tareas, fichas, miembros, pizarras, documentos e histórico.
 * @param user - Cuenta autenticada.
 * @param projectId - Proyecto que se elimina.
 * @returns El identificador y si se borró, o el fallo del contrato.
 */
export async function deleteProject(user: ChatGPTUser, projectId: string): Promise<DeleteProjectResult> {
  if (!((await isOwner(user)) || (await isAdministrator(user)))) {
    return { ok: false, status: 403, message: "Solo el propietario o un administrador pueden eliminar proyectos." };
  }
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
  try {
    await deleteProjectUploads(projectId);
  } catch {
    return { ok: false, status: 503, message: "El proyecto se ha eliminado, pero no se han podido limpiar todos sus archivos. Vuelve a intentarlo." };
  }
  return { ok: true, id: projectId, deleted: Boolean(result.meta.changes) };
}

/**
 * Lista los proyectos accesibles para la cuenta.
 * @param user - Cuenta autenticada.
 * @returns Los proyectos con su rol, en el orden de la tabla.
 */
export async function listVisibleProjects(user: ChatGPTUser): Promise<ProjectWithAccess[]> {
  if (isDemoUser(user)) {
    const [project] = await getDb().select().from(projects).where(eq(projects.id, DEMO_PROJECT_ID));
    return project
      ? [{ project, access: { user, role: "guest", studentSection: null, teacherId: null } }]
      : [];
  }
  const rows = await getDb().select().from(projects);
  const globalRole = await globalRoleForUser(user);
  const visible: ProjectWithAccess[] = [];
  for (const project of rows) {
    const access = globalRole
      ? { user, role: globalRole, studentSection: null, teacherId: null } satisfies Access
      : await memberAccess(project.id, user);
    if (access) visible.push({ project, access });
  }
  return visible;
}
