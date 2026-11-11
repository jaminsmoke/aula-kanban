import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projects } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureDefaultProject } from "../project";

export const dynamic = "force-dynamic";
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  if (!(await getChatGPTUser())) return json({ message: "Inicia sesión para acceder a los proyectos." }, 401);
  await ensureDefaultProject();
  return json(await getDb().select().from(projects).orderBy(asc(projects.createdAt), asc(projects.id)));
}

export async function POST(request: Request) {
  if (!(await getChatGPTUser())) return json({ message: "Inicia sesión para crear proyectos." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato no válido." }, 415);
  const parsed = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Escribe un nombre de hasta 80 caracteres." }, 400);
  const [created] = await getDb().insert(projects).values({ ...parsed.data, createdAt: Date.now() }).onConflictDoNothing().returning();
  if (created) return json(created, 201);
  const [existing] = await getDb().select().from(projects).where(eq(projects.id, parsed.data.id));
  if (existing?.name === parsed.data.name) return json(existing);
  return json({ message: "No se pudo crear el proyecto. Vuelve a intentarlo." }, 409);
}
