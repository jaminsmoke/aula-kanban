import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { administrators, projectMembers, projects } from "../../../db/schema";

/**
 * Acceso D1 de invitaciones pendientes de una cuenta.
 *
 * Los tipos públicos y los mensajes viven en `invitaciones.ts`; este módulo
 * solo localiza y activa las filas de proyecto y de administración.
 */

/** Invitación de proyecto tal como la devuelve la consulta. */
export type PendingProjectInvitationRow = { id: string; projectId: string; projectName: string; role: string };

/**
 * Lee las invitaciones pendientes del correo en ambas tablas.
 * @param email - Correo normalizado de la cuenta.
 * @returns Las filas de proyecto y de administración.
 */
export async function listPendingInvitationRows(email: string): Promise<{
  projectRows: PendingProjectInvitationRow[];
  adminRows: Array<{ id: string }>;
}> {
  const db = getDb();
  const [projectRows, adminRows] = await Promise.all([
    db.select({ id: projectMembers.id, projectId: projects.id, projectName: projects.name, role: projectMembers.role })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(and(eq(projectMembers.email, email), eq(projectMembers.status, "pending"))),
    db.select({ id: administrators.id })
      .from(administrators)
      .where(and(eq(administrators.email, email), isNull(administrators.userId))),
  ]);
  return { projectRows, adminRows };
}

/**
 * Activa una invitación de proyecto pendiente para la cuenta.
 * @param id - Identificador de la invitación.
 * @param email - Correo normalizado de la cuenta.
 * @param userId - Identificador estable de la cuenta.
 * @returns El proyecto activado o `null` si la invitación ya no aplica.
 */
export async function activateProjectInvitation(id: string, email: string, userId: string): Promise<string | null> {
  const [row] = await getDb()
    .update(projectMembers)
    .set({ status: "active", userId })
    .where(and(eq(projectMembers.id, id), eq(projectMembers.email, email), eq(projectMembers.status, "pending")))
    .returning({ projectId: projectMembers.projectId });
  return row?.projectId ?? null;
}

/**
 * Activa una invitación pendiente de administración del sitio.
 * @param id - Identificador de la ficha.
 * @param email - Correo normalizado de la cuenta.
 * @param userId - Identificador estable de la cuenta.
 * @returns `true` si la ficha se vinculó.
 */
export async function activateAdminInvitation(id: string, email: string, userId: string): Promise<boolean> {
  const [row] = await getDb()
    .update(administrators)
    .set({ userId })
    .where(and(eq(administrators.id, id), eq(administrators.email, email), isNull(administrators.userId)))
    .returning({ id: administrators.id });
  return Boolean(row);
}
