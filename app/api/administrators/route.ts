import { env } from "cloudflare:workers";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { administratorProfiles, administrators } from "../../../db/schema";
import { getChatGPTUser, type ChatGPTUser } from "../../chatgpt-auth";
import { isAdministrator, isOwner, isOwnerEmail } from "../project";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const email = z.string().trim().max(254).refine(value => !value || z.string().email().safeParse(value).success, "Correo no válido").transform(value => value.toLowerCase());
const fields = z.object({ displayName: z.string().trim().max(80).optional(), email: email.default("") });
async function authorized() { const user = await getChatGPTUser(); return user && (isOwner(user) || await isAdministrator(user)) ? user : null; }
async function input(request: Request) { return request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json" ? request.json().catch(() => null) : null; }
function guard(user: ChatGPTUser) { return isOwner(user) ? { sql: "1 = 1", args: [] as string[] } : { sql: "EXISTS (SELECT 1 FROM administrators WHERE user_id = ?)", args: [user.userId] }; }

export async function GET() {
  if (!await authorized()) return json({ message: "Solo el propietario o un administrador pueden gestionar administradores." }, 403);
  const db = getDb();
  const [profiles, accounts] = await Promise.all([db.select().from(administratorProfiles).orderBy(asc(administratorProfiles.displayName)), db.select().from(administrators).orderBy(asc(administrators.email))]);
  const result = profiles.map(profile => { const account = accounts.find(item => item.profileId === profile.id); return { id: profile.id, displayName: profile.displayName, email: account?.email ?? "", revision: profile.revision, accountStatus: account ? account.userId ? "active" : "pending" : "unlinked", active: Boolean(account?.userId) }; });
  // Existing accounts from older versions remain usable and can be given a profile when edited.
  return json([...result, ...accounts.filter(account => !account.profileId).map(account => ({ id: account.id, displayName: "", email: account.email, revision: 0, accountStatus: account.userId ? "active" : "pending", active: Boolean(account.userId) }))]);
}
export async function POST(request: Request) {
  const user = await authorized(); if (!user) return json({ message: "Solo el propietario o un administrador pueden gestionar administradores." }, 403);
  const parsed = fields.safeParse(await input(request)); if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const { email } = parsed.data; const displayName = parsed.data.displayName ?? "";
  if (email && isOwnerEmail(email)) return json({ message: "La cuenta propietaria ya es administradora." }, 400);
  const id = crypto.randomUUID(), binding = env.DB; if (!binding) return json({ message: "Base de datos no disponible." }, 503);
  const auth = guard(user);
  try {
    const statements = [binding.prepare(`INSERT INTO administrator_profiles (id, display_name) SELECT ?, ? WHERE ${auth.sql} RETURNING id`).bind(id, displayName, ...auth.args)];
    if (email) statements.push(binding.prepare("INSERT INTO administrators (id, profile_id, email, created_at) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM administrator_profiles WHERE id = ?)").bind(crypto.randomUUID(), id, email, Date.now(), id));
    const result = await binding.batch(statements); if (!result[0].results?.length) return json({ message: "Ya no tienes permiso para crear fichas de administrador." }, 403);
    return json({ id, displayName, email, revision: 1, accountStatus: email ? "pending" : "unlinked", active: false }, 201);
  } catch { return json({ message: "No se pudo crear la ficha. Comprueba que el correo no esté ya asignado a otro administrador." }, 409); }
}
export async function PATCH(request: Request) {
  const user = await authorized(); if (!user) return json({ message: "Solo el propietario o un administrador pueden gestionar administradores." }, 403);
  const parsed = fields.extend({ id: z.string().uuid(), revision: z.number().int().nonnegative().optional() }).safeParse(await input(request));
  if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const { id, email } = parsed.data;
  if (email && isOwnerEmail(email)) return json({ message: "La cuenta propietaria ya es administradora." }, 400);
  const db = getDb(); const [profile] = await db.select().from(administratorProfiles).where(eq(administratorProfiles.id, id));
  const displayName = parsed.data.displayName ?? profile?.displayName ?? "";
  const [legacy] = profile ? [] : await db.select().from(administrators).where(eq(administrators.id, id));
  if (!profile && (!legacy || legacy.profileId)) return json({ message: "La ficha ya no existe." }, 404);
  const binding = env.DB; if (!binding) return json({ message: "Base de datos no disponible." }, 503);
  const token = crypto.randomUUID(), auth = guard(user);
  const first = profile
    ? binding.prepare(`UPDATE administrator_profiles SET display_name = ?, revision = revision + 1, mutation_token = ? WHERE id = ? AND revision = ? AND ${auth.sql} RETURNING id`).bind(displayName, token, id, parsed.data.revision ?? profile.revision, ...auth.args)
    : binding.prepare(`INSERT INTO administrator_profiles (id, display_name, revision, mutation_token) SELECT ?, ?, 1, ? WHERE ${auth.sql} AND EXISTS (SELECT 1 FROM administrators WHERE id = ? AND profile_id IS NULL) ON CONFLICT(id) DO NOTHING RETURNING id`).bind(id, displayName, token, ...auth.args, id);
  const statements = [first];
  if (!profile) statements.push(binding.prepare("UPDATE administrators SET profile_id = ? WHERE id = ? AND profile_id IS NULL AND EXISTS (SELECT 1 FROM administrator_profiles WHERE id = ? AND mutation_token = ?)").bind(id, id, id, token));
  if (email) statements.push(binding.prepare("INSERT INTO administrators (id, email, profile_id, created_at) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM administrator_profiles WHERE id = ? AND mutation_token = ?) ON CONFLICT(profile_id) DO UPDATE SET email = excluded.email, user_id = CASE WHEN administrators.email = excluded.email THEN administrators.user_id ELSE NULL END").bind(crypto.randomUUID(), email, id, Date.now(), id, token));
  else statements.push(binding.prepare("DELETE FROM administrators WHERE profile_id = ? AND EXISTS (SELECT 1 FROM administrator_profiles WHERE id = ? AND mutation_token = ?)").bind(id, id, token));
  try {
    const result = await binding.batch(statements); if (!result[0].results?.length) return json({ message: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." }, 409);
    const [updated] = await db.select().from(administratorProfiles).where(eq(administratorProfiles.id, id));
    const [account] = await db.select().from(administrators).where(eq(administrators.profileId, id));
    return json({ id, displayName: updated.displayName, email: account?.email ?? "", revision: updated.revision, accountStatus: account ? account.userId ? "active" : "pending" : "unlinked", active: Boolean(account?.userId) });
  } catch { return json({ message: "No se guardaron los cambios. Comprueba que el correo no esté asignado a otro administrador." }, 409); }
}
export async function DELETE(request: Request) {
  const user = await authorized(); if (!user) return json({ message: "Solo el propietario o un administrador pueden gestionar administradores." }, 403);
  const parsed = z.object({ id: z.string().uuid(), revision: z.number().int().nonnegative().optional() }).safeParse(await input(request));
  if (!parsed.success) return json({ message: "Ficha no válida." }, 400);
  const { id } = parsed.data, db = getDb(); const [profile] = await db.select().from(administratorProfiles).where(eq(administratorProfiles.id, id));
  const binding = env.DB; if (!binding) return json({ message: "Base de datos no disponible." }, 503);
  const auth = guard(user), token = crypto.randomUUID();
  try {
    if (!profile) {
      const result = await binding.prepare(`DELETE FROM administrators WHERE id = ? AND profile_id IS NULL AND ${auth.sql} RETURNING id`).bind(id, ...auth.args).all();
      return result.results?.length ? json({ id }) : json({ message: "La ficha ya no existe." }, 404);
    }
    const result = await binding.batch([
      binding.prepare(`UPDATE administrator_profiles SET mutation_token = ? WHERE id = ? AND revision = ? AND ${auth.sql} RETURNING id`).bind(token, id, parsed.data.revision ?? profile.revision, ...auth.args),
      binding.prepare("DELETE FROM administrators WHERE profile_id = ? AND EXISTS (SELECT 1 FROM administrator_profiles WHERE id = ? AND mutation_token = ?)").bind(id, id, token),
      binding.prepare("DELETE FROM administrator_profiles WHERE id = ? AND mutation_token = ?").bind(id, token),
    ]);
    return result[0].results?.length ? json({ id }) : json({ message: "La ficha cambió o ya no tienes permiso." }, 409);
  } catch { return json({ message: "No se pudo eliminar la ficha." }, 409); }
}
