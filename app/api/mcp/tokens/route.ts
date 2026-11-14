import { z } from "zod";
import { getD1 } from "../../../../db";
import { getChatGPTUser } from "../../../../lib/server/auth";
import { isJsonRequest, isSameOrigin, json } from "../../../../lib/server/http";
import { createMcpToken, listMcpTokens, revokeMcpToken } from "../../../../lib/server/mcp/tokens";

export const dynamic = "force-dynamic";

const createBody = z.object({ label: z.string().trim().max(80).optional() });

/**
 * Gestión de tokens del MCP con la sesión del navegador (Fase 1: API; la UI
 * llega en la Fase 2). La creación devuelve el token completo una sola vez;
 * el listado nunca expone hash ni sal.
 */

/**
 * Lista los tokens propios sin secretos.
 * @returns Los metadatos públicos de los tokens de la cuenta.
 */
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para gestionar tus tokens." }, 401);
  let db;
  try {
    db = getD1();
  } catch {
    return json({ message: "Base de datos no disponible." }, 503);
  }
  return json(await listMcpTokens(db, user.userId));
}

/**
 * Crea un token y lo devuelve una única vez junto con sus metadatos.
 * @param request - Petición con la etiqueta opcional en el cuerpo JSON.
 * @returns El token en claro con sus metadatos, o el error.
 */
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para gestionar tus tokens." }, 401);
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const parsed = createBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Etiqueta no válida." }, 400);
  let db;
  try {
    db = getD1();
  } catch {
    return json({ message: "Base de datos no disponible." }, 503);
  }
  const created = await createMcpToken(db, user.userId, user.email, parsed.data.label ?? "");
  return json(created, 201);
}

/**
 * Revoca un token propio por su identificador.
 * @param request - Petición con el identificador en la query `?id=`.
 * @returns 204 al revocar, o el error.
 */
export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para gestionar tus tokens." }, 401);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) return json({ message: "Identificador no válido." }, 400);
  let db;
  try {
    db = getD1();
  } catch {
    return json({ message: "Base de datos no disponible." }, 503);
  }
  const revoked = await revokeMcpToken(db, user.userId, id);
  if (!revoked) return json({ message: "Token no encontrado." }, 404);
  return new Response(null, { status: 204 });
}
