import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { administrators } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isOwner } from "../project";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const idSchema = z.string().uuid();

async function ownerOnly() {
  const user = await getChatGPTUser();
  return user && isOwner(user) ? user : null;
}
async function input(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return null;
  return request.json().catch(() => null);
}

export async function GET() {
  if (!await ownerOnly()) return json({ message: "Solo el propietario puede gestionar administradores." }, 403);
  const rows = await getDb().select({ id: administrators.id, email: administrators.email, userId: administrators.userId, createdAt: administrators.createdAt }).from(administrators).orderBy(asc(administrators.email));
  return json(rows.map(({ userId, ...row }) => ({ ...row, active: Boolean(userId) })));
}
export async function POST(request: Request) {
  const owner = await ownerOnly();
  if (!owner) return json({ message: "Solo el propietario puede gestionar administradores." }, 403);
  const parsed = z.object({ email: emailSchema }).safeParse(await input(request));
  if (!parsed.success) return json({ message: "Introduce un correo válido." }, 400);
  if (parsed.data.email === owner.email.trim().toLowerCase()) return json({ message: "La cuenta propietaria ya es administradora." }, 400);
  try {
    const [row] = await getDb().insert(administrators).values({ id: crypto.randomUUID(), email: parsed.data.email, createdAt: Date.now() }).returning();
    return json({ id: row.id, email: row.email, createdAt: row.createdAt, active: false }, 201);
  } catch { return json({ message: "Ya existe un administrador con ese correo." }, 409); }
}
export async function PATCH(request: Request) {
  const owner = await ownerOnly();
  if (!owner) return json({ message: "Solo el propietario puede gestionar administradores." }, 403);
  const parsed = z.object({ id: idSchema, email: emailSchema }).safeParse(await input(request));
  if (!parsed.success) return json({ message: "Revisa los datos del administrador." }, 400);
  if (parsed.data.email === owner.email.trim().toLowerCase()) return json({ message: "La cuenta propietaria ya es administradora." }, 400);
  try {
    const [current] = await getDb().select().from(administrators).where(eq(administrators.id, parsed.data.id));
    if (!current) return json({ message: "El administrador ya no existe." }, 404);
    if (current.email === parsed.data.email) return json({ id: current.id, email: current.email, createdAt: current.createdAt, active: Boolean(current.userId) });
    const [row] = await getDb().update(administrators).set({ email: parsed.data.email, userId: null }).where(eq(administrators.id, parsed.data.id)).returning();
    return row ? json({ id: row.id, email: row.email, createdAt: row.createdAt, active: false }) : json({ message: "El administrador ya no existe." }, 404);
  } catch { return json({ message: "Ya existe un administrador con ese correo." }, 409); }
}
export async function DELETE(request: Request) {
  if (!await ownerOnly()) return json({ message: "Solo el propietario puede gestionar administradores." }, 403);
  const parsed = z.object({ id: idSchema }).safeParse(await input(request));
  if (!parsed.success) return json({ message: "Administrador no válido." }, 400);
  const [row] = await getDb().delete(administrators).where(eq(administrators.id, parsed.data.id)).returning({ id: administrators.id });
  return row ? json(row) : json({ message: "El administrador ya no existe." }, 404);
}
