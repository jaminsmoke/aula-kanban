import { z } from "zod";
import { inviteMember, listMembers, removeMember } from "../../../lib/server/members";
import { json } from "../../../lib/server/http";
import { withJsonMutation, withProjectRoute } from "../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/** Lista los miembros e invitaciones del proyecto. */
export const GET = withProjectRoute(async (_request, project) => {
  const result = await listMembers(project.id, project.access);
  return result.ok ? json(result.miembros) : json({ message: result.message }, result.status);
});

/** Crea una invitación `pending` para un correo con rol y ficha opcional. */
export const POST = withJsonMutation(withProjectRoute(async (request, project) => {
  const result = await inviteMember(project, await request.json().catch(() => null));
  return result.ok ? json(result.miembro, result.creada ? 201 : 200) : json({ message: result.message }, result.status);
}));

/** Retira un miembro o invitación del proyecto. */
export const DELETE = withJsonMutation(withProjectRoute(async (request, project) => {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Miembro no válido." }, 400);
  const result = await removeMember(project, parsed.data.id);
  return result.ok ? json({ id: result.id }) : json({ message: result.message }, result.status);
}));
