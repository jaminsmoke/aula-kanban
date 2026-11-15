import { z } from "zod";
import { inviteMember, listMembers, removeMember } from "../../../lib/server/members";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";
import { projectFailureResponse, resolveProject } from "../../../lib/server/project-access";

export const dynamic = "force-dynamic";

/**
 * Lista los miembros e invitaciones del proyecto.
 * @param request - Petición con el proyecto en la URL.
 * @returns Respuesta JSON con los miembros sin exponer `userId`.
 */
export async function GET(request: Request) {
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const result = await listMembers(resolved.project.id, resolved.project.access);
  return result.ok ? json(result.miembros) : json({ message: result.message }, result.status);
}

/**
 * Crea una invitación `pending` para un correo con rol y ficha opcional.
 * @param request - Petición con correo, rol y ficha a vincular.
 * @returns Respuesta JSON con la invitación creada o actualizada.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const result = await inviteMember(resolved.project, await request.json().catch(() => null));
  return result.ok ? json(result.miembro, result.creada ? 201 : 200) : json({ message: result.message }, result.status);
}

/**
 * Retira un miembro o invitación del proyecto.
 * @param request - Petición con el identificador del miembro.
 * @returns Respuesta JSON con el identificador retirado o el error.
 */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Miembro no válido." }, 400);
  const result = await removeMember(resolved.project, parsed.data.id);
  return result.ok ? json({ id: result.id }) : json({ message: result.message }, result.status);
}
