import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { administrators, projectMembers, projects } from "../../../db/schema";

/**
 * Acceso D1 de la resolución de acceso a proyectos: administradores,
 * membresías y fila del proyecto.
 *
 * La propiedad, el bootstrap, la autorización y los tipos públicos viven en
 * `project-access.ts`; este módulo solo lee y sincroniza las filas.
 */

/** Fila de `administrators_unified`. */
export type AdministratorAccessRow = typeof administrators.$inferSelect;

/** Fila de `project_members`. */
export type MemberAccessRow = typeof projectMembers.$inferSelect;

/** Fila de `projects`. */
export type ProjectAccessRow = typeof projects.$inferSelect;

/**
 * Busca la ficha de administrador vinculada a una cuenta.
 * @param userId - Identificador estable de la cuenta.
 * @returns La fila o `null`.
 */
export async function findAdministratorRowByUser(userId: string): Promise<AdministratorAccessRow | null> {
  const [row] = await getDb().select().from(administrators).where(eq(administrators.userId, userId));
  return row ?? null;
}

/**
 * Sincroniza el correo de una ficha de administrador.
 * @param id - Identificador de la ficha.
 * @param userId - Cuenta vinculada.
 * @param email - Correo normalizado.
 */
export async function updateAdministratorEmailRow(id: string, userId: string, email: string): Promise<void> {
  await getDb()
    .update(administrators)
    .set({ email })
    .where(and(eq(administrators.id, id), eq(administrators.userId, userId)));
}

/**
 * Busca la membresía activa de una cuenta en un proyecto.
 * @param projectId - Proyecto activo.
 * @param userId - Identificador estable de la cuenta.
 * @returns La fila activa o `null`.
 */
export async function findActiveMemberRow(projectId: string, userId: string): Promise<MemberAccessRow | null> {
  const [row] = await getDb().select().from(projectMembers).where(and(
    eq(projectMembers.projectId, projectId),
    eq(projectMembers.userId, userId),
    eq(projectMembers.status, "active"),
  ));
  return row ?? null;
}

/**
 * Sincroniza el correo de una membresía activa.
 * @param id - Identificador de la membresía.
 * @param userId - Cuenta vinculada.
 * @param email - Correo normalizado.
 */
export async function updateMemberEmailRow(id: string, userId: string, email: string): Promise<void> {
  await getDb()
    .update(projectMembers)
    .set({ email })
    .where(and(
      eq(projectMembers.id, id),
      eq(projectMembers.userId, userId),
      eq(projectMembers.status, "active"),
    ));
}

/**
 * Busca la fila de un proyecto por identificador canónico.
 * @param projectId - Identificador del proyecto.
 * @returns La fila o `null`.
 */
export async function findProjectAccessRow(projectId: string): Promise<ProjectAccessRow | null> {
  const [project] = await getDb().select().from(projects).where(eq(projects.id, projectId));
  return project ?? null;
}
