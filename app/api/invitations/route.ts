import { z } from "zod";
import { isDemoUser } from "../../../lib/domain/demo";
import { getChatGPTUser } from "../../../lib/server/auth";
import { acceptInvitation, listPendingInvitations } from "../../../lib/server/invitaciones";
import { projectFailureResponse } from "../../../lib/server/project-http";
import { json } from "../../../lib/server/http";
import { withJsonMutation } from "../../../lib/server/route-helpers";

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

/** Acepta una invitación pendiente y activa el acceso de la cuenta. */
export const POST = withJsonMutation(async (request) => {
  const user = await getChatGPTUser(); if (!user) return projectFailureResponse("unauthenticated");
  if (isDemoUser(user)) return json({ message: "La demo es de solo lectura." }, 403);
  const parsed = z.object({ id: z.string().uuid(), scope: z.enum(["project", "site"]).default("project") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Invitación no válida." }, 400);
  const result = await acceptInvitation(user, parsed.data.id, parsed.data.scope);
  return result.ok ? json({ projectId: result.projectId, scope: result.scope }) : json({ message: result.mensaje }, result.codigo === "not_found" ? 404 : 409);
});
