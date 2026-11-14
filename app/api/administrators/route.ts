import { env } from "cloudflare:workers";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { administrators } from "../../../db/schema";
import { getChatGPTUser, type ChatGPTUser } from "../../../lib/server/auth";
import { isAdministrator, isOwner, isOwnerEmail } from "../../../lib/server/project";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";

export const dynamic = "force-dynamic";
const email = z.string().trim().max(254).refine(value => !value || z.string().email().safeParse(value).success, "Correo no válido").transform(value => value.toLowerCase());
const fields = z.object({ displayName: z.string().trim().max(80).optional(), email: email.default("") });
async function authorized() { const user = await getChatGPTUser(); return user && (isOwner(user) || await isAdministrator(user)) ? user : null; }
async function input(request: Request) { return request.json().catch(() => null); }
function guard(user: ChatGPTUser) { return isOwner(user) ? { sql: "1 = 1", args: [] as string[] } : { sql: "EXISTS (SELECT 1 FROM administrators_unified WHERE user_id = ?)", args: [user.userId] }; }
type Row = typeof administrators.$inferSelect;
// An email is an invitation until an account accepts it; a row without email grants nothing.
function view(row: Row) {
  return { id: row.id, displayName: row.displayName, email: row.email ?? "", revision: row.revision, accountStatus: row.userId ? "active" : row.email ? "pending" : "unlinked", active: Boolean(row.userId) };
}

/**
 * Lista las fichas de administrador ordenadas por nombre y correo.
 * @returns Respuesta JSON con las fichas visibles.
 */
export async function GET() {
  if (!await authorized()) return json({ message: "Solo el propietario o un administrador pueden gestionar administradores." }, 403);
  const rows = await getDb().select().from(administrators).orderBy(asc(administrators.displayName), asc(administrators.email));
  return json(rows.map(view));
}

/**
 * Crea una ficha de administrador, con invitación pendiente si lleva correo.
 * @param request - Petición con nombre a mostrar y correo opcional.
 * @returns Respuesta JSON con la ficha creada.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await authorized(); if (!user) return json({ message: "Solo el propietario o un administrador pueden gestionar administradores." }, 403);
  const parsed = fields.safeParse(await input(request)); if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const { email } = parsed.data, displayName = parsed.data.displayName ?? "";
  if (email && isOwnerEmail(email)) return json({ message: "La cuenta propietaria ya es administradora." }, 400);
  const binding = env.DB; if (!binding) return json({ message: "Base de datos no disponible." }, 503);
  const id = crypto.randomUUID(), auth = guard(user);
  try {
    const createdAt = Date.now();
    const result = await binding.prepare(`INSERT INTO administrators_unified (id, email, user_id, display_name, revision, created_at) SELECT ?, ?, NULL, ?, 1, ? WHERE ${auth.sql} RETURNING id`).bind(id, email || null, displayName, createdAt, ...auth.args).all();
    if (!result.results?.length) return json({ message: "Ya no tienes permiso para crear fichas de administrador." }, 403);
    const [created] = await getDb().select().from(administrators).where(eq(administrators.id, id));
    return json(view(created), 201);
  } catch { return json({ message: "No se pudo crear la ficha. Comprueba que el correo no esté ya asignado a otro administrador." }, 409); }
}

/**
 * Actualiza una ficha; cambiar el correo retira el acceso hasta reaceptar.
 * @param request - Petición con identificador, revisión y nuevos valores.
 * @returns Respuesta JSON con la ficha actualizada.
 */
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await authorized(); if (!user) return json({ message: "Solo el propietario o un administrador pueden gestionar administradores." }, 403);
  const parsed = fields.extend({ id: z.string().uuid(), revision: z.number().int().nonnegative().optional() }).safeParse(await input(request));
  if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const { id } = parsed.data, nextEmail = parsed.data.email;
  if (nextEmail && isOwnerEmail(nextEmail)) return json({ message: "La cuenta propietaria ya es administradora." }, 400);
  const db = getDb(), [current] = await db.select().from(administrators).where(eq(administrators.id, id));
  if (!current) return json({ message: "La ficha ya no existe." }, 404);
  const displayName = parsed.data.displayName ?? current.displayName;
  // Only an unchanged email keeps the linked account; any change revokes access until it accepts again.
  const userId = current.email !== null && current.email === nextEmail ? current.userId : null;
  const binding = env.DB; if (!binding) return json({ message: "Base de datos no disponible." }, 503);
  const auth = guard(user);
  try {
    const result = await binding.prepare(`UPDATE administrators_unified SET display_name = ?, email = ?, user_id = ?, revision = revision + 1, mutation_token = ? WHERE id = ? AND revision = ? AND ${auth.sql} RETURNING id`).bind(displayName, nextEmail || null, userId, crypto.randomUUID(), id, parsed.data.revision ?? current.revision, ...auth.args).all();
    if (!result.results?.length) return json({ message: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." }, 409);
    const [updated] = await db.select().from(administrators).where(eq(administrators.id, id));
    return json(view(updated));
  } catch { return json({ message: "No se guardaron los cambios. Comprueba que el correo no esté asignado a otro administrador." }, 409); }
}

/**
 * Elimina una ficha de administrador.
 * @param request - Petición con identificador y revisión de la ficha.
 * @returns Respuesta JSON con el identificador eliminado.
 */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await authorized(); if (!user) return json({ message: "Solo el propietario o un administrador pueden gestionar administradores." }, 403);
  const parsed = z.object({ id: z.string().uuid(), revision: z.number().int().nonnegative().optional() }).safeParse(await input(request));
  if (!parsed.success) return json({ message: "Ficha no válida." }, 400);
  const { id } = parsed.data, db = getDb(), [current] = await db.select().from(administrators).where(eq(administrators.id, id));
  if (!current) return json({ message: "La ficha ya no existe." }, 404);
  const binding = env.DB; if (!binding) return json({ message: "Base de datos no disponible." }, 503);
  const auth = guard(user);
  try {
    const result = await binding.prepare(`DELETE FROM administrators_unified WHERE id = ? AND revision = ? AND ${auth.sql} RETURNING id`).bind(id, parsed.data.revision ?? current.revision, ...auth.args).all();
    return result.results?.length ? json({ id }) : json({ message: "La ficha cambió o ya no tienes permiso." }, 409);
  } catch { return json({ message: "No se pudo eliminar la ficha." }, 409); }
}
