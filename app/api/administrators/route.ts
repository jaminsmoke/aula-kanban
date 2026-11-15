import { z } from "zod";
import { ADMINISTRADORES_FORBIDDEN, actualizarAdministrador, crearAdministrador, eliminarAdministrador, listarAdministradores, puedeGestionarAdministradores } from "../../../lib/server/administradores";
import { getChatGPTUser } from "../../../lib/server/auth";
import { projectFailureResponse } from "../../../lib/server/project-access";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";

export const dynamic = "force-dynamic";
const email = z.string().trim().max(254).refine(value => !value || z.string().email().safeParse(value).success, "Correo no válido").transform(value => value.toLowerCase());
const fields = z.object({ displayName: z.string().trim().max(80).optional(), email: email.default("") });
async function input(request: Request) { return request.json().catch(() => null); }

/**
 * Lista las fichas de administrador ordenadas por nombre y correo.
 * @returns Respuesta JSON con las fichas visibles.
 */
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const result = await listarAdministradores(user);
  return result.ok ? json(result.valor) : json({ message: result.message }, result.status);
}

/**
 * Crea una ficha de administrador, con invitación pendiente si lleva correo.
 * @param request - Petición con nombre a mostrar y correo opcional.
 * @returns Respuesta JSON con la ficha creada.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  if (!(await puedeGestionarAdministradores(user))) return json({ message: ADMINISTRADORES_FORBIDDEN }, 403);
  const parsed = fields.safeParse(await input(request));
  if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const result = await crearAdministrador(user, parsed.data);
  return result.ok ? json(result.valor, 201) : json({ message: result.message }, result.status);
}

/**
 * Actualiza una ficha; cambiar el correo retira el acceso hasta reaceptar.
 * @param request - Petición con identificador, revisión y nuevos valores.
 * @returns Respuesta JSON con la ficha actualizada.
 */
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  if (!(await puedeGestionarAdministradores(user))) return json({ message: ADMINISTRADORES_FORBIDDEN }, 403);
  const parsed = fields.extend({ id: z.string().uuid(), revision: z.number().int().nonnegative().optional() }).safeParse(await input(request));
  if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const result = await actualizarAdministrador(user, parsed.data);
  return result.ok ? json(result.valor) : json({ message: result.message }, result.status);
}

/**
 * Elimina una ficha de administrador.
 * @param request - Petición con identificador y revisión de la ficha.
 * @returns Respuesta JSON con el identificador eliminado.
 */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  if (!(await puedeGestionarAdministradores(user))) return json({ message: ADMINISTRADORES_FORBIDDEN }, 403);
  const parsed = z.object({ id: z.string().uuid(), revision: z.number().int().nonnegative().optional() }).safeParse(await input(request));
  if (!parsed.success) return json({ message: "Ficha no válida." }, 400);
  const result = await eliminarAdministrador(user, parsed.data);
  return result.ok ? json(result.valor) : json({ message: result.message }, result.status);
}
