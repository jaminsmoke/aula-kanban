import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { teachers } from "../../../db/schema";
import { validProject } from "../project";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const fields = z.object({ name: z.string().trim().min(1).max(80), role: z.string().trim().max(500), activities: z.string().trim().max(2000), aiHelp: z.string().trim().max(2000) });
const reference = z.object({ id: z.string().uuid(), revision: z.number().int().positive() });

export async function GET(request: Request) {
  const project = await validProject(request);
  if (!project) return json({ message: "No se encuentra el proyecto." }, 404);
  return json(await getDb().select().from(teachers).where(eq(teachers.projectId, project.id)).orderBy(asc(teachers.name), asc(teachers.id)));
}
async function mutate(request: Request) {
  const project = await validProject(request);
  if (!project) return json({ message: "No se encuentra el proyecto." }, 404);
  if (project.access.role === "student") return json({ message: "Solo el profesorado puede gestionar fichas de profesores." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato no válido." }, 415);
  const body = await request.json().catch(() => null);
  if (request.method === "POST") {
    const parsed = fields.extend({ id: z.string().uuid() }).safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los campos de la ficha." }, 400);
    try {
      const [created] = await getDb().insert(teachers).values({ ...parsed.data, projectId: project.id }).onConflictDoNothing().returning();
      return created ? json(created, 201) : json({ message: "La ficha ya existe." }, 409);
    } catch { return json({ message: "No se pudo guardar la ficha. Comprueba que el proyecto sigue disponible." }, 409); }
  }
  const parsed = (request.method === "DELETE" ? reference : fields.merge(reference)).safeParse(body);
  if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const { id, revision, ...changes } = parsed.data;
  const where = and(eq(teachers.id, id), eq(teachers.projectId, project.id), eq(teachers.revision, revision));
  const [result] = request.method === "DELETE"
    ? await getDb().delete(teachers).where(where).returning()
    : await getDb().update(teachers).set({ ...changes, revision: sql`${teachers.revision} + 1` }).where(where).returning();
  return result ? json(result) : json({ message: "La ficha ha cambiado en otra sesión. Actualiza la página para verla." }, 409);
}
export { mutate as POST, mutate as PATCH, mutate as DELETE };
