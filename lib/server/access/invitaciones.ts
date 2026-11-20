import type { ChatGPTUser } from "./auth";
import { activateAdminInvitation, activateProjectInvitation, listPendingInvitationRows } from "./invitaciones-repository";

/**
 * Invitaciones pendientes de una cuenta y su aceptación.
 *
 * Extrae la lógica de `app/api/invitations/route.ts` para que la ruta HTTP
 * y las herramientas MCP (`listar_invitaciones_pendientes`,
 * `aceptar_invitacion`) llamen a la misma función con la misma cuenta
 * (MCP-01). Una invitación nunca se envía por correo: la persona la acepta
 * en la app o con la herramienta desde su propia cuenta. El acceso D1 vive
 * en `invitaciones-repository.ts`.
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
  const email = user.email.trim().toLowerCase();
  const { projectRows, adminRows } = await listPendingInvitationRows(email);
  return [
    ...projectRows.map((row) => ({ ...row, scope: "project" as const })),
    ...adminRows.map((row) => ({ id: row.id, projectId: null, projectName: "Administración de Aula Kanban", role: "admin" as const, scope: "site" as const })),
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
      const activated = await activateAdminInvitation(id, email, user.userId);
      return activated
        ? { ok: true, projectId: null, scope: "site" }
        : { ok: false, codigo: "not_found", mensaje: "La invitación ya no está disponible para esta cuenta." };
    }
    const projectId = await activateProjectInvitation(id, email, user.userId);
    return projectId
      ? { ok: true, projectId, scope: "project" }
      : { ok: false, codigo: "not_found", mensaje: "La invitación ya no está disponible para esta cuenta." };
  } catch {
    return { ok: false, codigo: "conflict", mensaje: "No se pudo aceptar la invitación. Es posible que tu cuenta ya pertenezca al proyecto." };
  }
}
