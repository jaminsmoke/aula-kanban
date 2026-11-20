import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { administrators, projectMembers, projects } from "../../../db/schema";
import type { ChatGPTUser } from "./auth";

/**
 * Invitaciones pendientes de una cuenta y su aceptación.
 *
 * Extrae la lógica de `app/api/invitations/route.ts` para que la ruta HTTP
 * y las herramientas MCP (`listar_invitaciones_pendientes`,
 * `aceptar_invitacion`) llamen a la misma función con la misma cuenta
 * (MCP-01). Una invitación nunca se envía por correo: la persona la acepta
 * en la app o con la herramienta desde su propia cuenta.
 */

/** Invitación de proyecto pendiente. */
export type ProjectInvitation = { id: string; projectId: string; projectName: string; role: string; scope: "project" };

/** Invitación de administración del sitio pendiente. */
export type SiteInvitation = { id: string; projectId: null; projectName: string; role: "admin"; scope: "site" };

/** Todas las invitaciones pendientes de una cuenta. */
export type PendingInvitation = ProjectInvitation | SiteInvitation;

/** Ámbito aceptable de una invitación. */
export type AcceptScope = "project" | "site";

/** Resultado de aceptar una invitación. */
export type AcceptInvitationResult =
  | { ok: true; projectId: string | null; scope: AcceptScope }
  | { ok: false; codigo: "not_found" | "conflict"; mensaje: string };

/**
 * Lista las invitaciones pendientes de la cuenta (proyecto y administración).
 * @param user - Cuenta autenticada.
 * @returns Las invitaciones pendientes con su ámbito.
 */
export async function listPendingInvitations(user: ChatGPTUser): Promise<PendingInvitation[]> {
  const db = getDb();
  const email = user.email.trim().toLowerCase();
  const [rows, adminInvitations] = await Promise.all([
    db.select({ id: projectMembers.id, projectId: projects.id, projectName: projects.name, role: projectMembers.role }).from(projectMembers).innerJoin(projects, eq(projects.id, projectMembers.projectId)).where(and(eq(projectMembers.email, email), eq(projectMembers.status, "pending"))),
    db.select({ id: administrators.id }).from(administrators).where(and(eq(administrators.email, email), isNull(administrators.userId))),
  ]);
  return [
    ...rows.map((row) => ({ ...row, scope: "project" as const })),
    ...adminInvitations.map((row) => ({ id: row.id, projectId: null, projectName: "Administración de Aula Kanban", role: "admin" as const, scope: "site" as const })),
  ];
}

/**
 * Acepta una invitación pendiente de la cuenta.
 * @param user - Cuenta autenticada (debe coincidir con el correo invitado).
 * @param id - Identificador de la invitación.
 * @param scope - Ámbito de la invitación (`project` | `site`).
 * @returns El proyecto aceptado, 404 si ya no es para esta cuenta o 409 si ya pertenece.
 */
export async function acceptInvitation(user: ChatGPTUser, id: string, scope: AcceptScope): Promise<AcceptInvitationResult> {
  const email = user.email.trim().toLowerCase();
  try {
    if (scope === "site") {
      const [row] = await getDb().update(administrators).set({ userId: user.userId }).where(and(eq(administrators.id, id), eq(administrators.email, email), isNull(administrators.userId))).returning({ id: administrators.id });
      return row
        ? { ok: true, projectId: null, scope: "site" }
        : { ok: false, codigo: "not_found", mensaje: "La invitación ya no está disponible para esta cuenta." };
    }
    const [row] = await getDb().update(projectMembers).set({ status: "active", userId: user.userId }).where(and(eq(projectMembers.id, id), eq(projectMembers.email, email), eq(projectMembers.status, "pending"))).returning({ projectId: projectMembers.projectId });
    return row
      ? { ok: true, projectId: row.projectId, scope: "project" }
      : { ok: false, codigo: "not_found", mensaje: "La invitación ya no está disponible para esta cuenta." };
  } catch {
    return { ok: false, codigo: "conflict", mensaje: "No se pudo aceptar la invitación. Es posible que tu cuenta ya pertenezca al proyecto." };
  }
}
