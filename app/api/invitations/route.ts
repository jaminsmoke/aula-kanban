import { z } from "zod";
import { getChatGPTUser } from "../../../lib/server/auth";
import { acceptInvitation, listPendingInvitations } from "../../../lib/server/invitaciones";
import { projectFailureResponse } from "../../../lib/server/project-access";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";

export const dynamic = "force-dynamic";
/**
 * Lista las invitaciones pendientes para la cuenta autenticada.
 * Incluye invitaciones de proyecto y de administración del sitio.
 * @returns Respuesta JSON con las invitaciones pendientes.
 */
export async function GET() {
  const user = await getChatGPTUser(); if (!user) return projectFailureResponse("unauthenticated");
  return json(await listPendingInvitations(user));
}
/**
 * Acepta una invitación pendiente y activa el acceso de la cuenta.
 * @param request - Petición con el identificador y ámbito de la invitación.
 * @returns Respuesta JSON con el proyecto aceptado o el error.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await getChatGPTUser(); if (!user) return projectFailureResponse("unauthenticated");
  const parsed = z.object({ id: z.string().uuid(), scope: z.enum(["project", "site"]).default("project") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Invitación no válida." }, 400);
  const result = await acceptInvitation(user, parsed.data.id, parsed.data.scope);
  return result.ok ? json({ projectId: result.projectId, scope: result.scope }) : json({ message: result.mensaje }, result.codigo === "not_found" ? 404 : 409);
}
