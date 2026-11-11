import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { tasks } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { priorities, statuses } from "../../task";

export const dynamic = "force-dynamic";

const fields = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  assignee: z.string().trim().max(80),
  dueDate: z.union([z.literal(""), z.string().date()]),
  priority: z.enum(priorities),
  status: z.enum(statuses),
});
const reference = z.object({
  id: z.string().uuid(),
  revision: z.number().int().positive(),
  changes: z.unknown().optional(),
});

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function handle(request: Request) {
  if (!(await getChatGPTUser())) {
    return json({ message: "Inicia sesión para acceder al tablero." }, 401);
  }

  if (request.method === "GET") {
    const list = await getDb().select().from(tasks).orderBy(asc(tasks.createdAt), asc(tasks.id));
    return json(list);
  }

  const mime = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mime !== "application/json") {
    return json({ message: "Formato de solicitud no válido." }, 415);
  }
  const body = await request.json().catch(() => null);

  if (request.method === "POST") {
    const parsed = fields.safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los campos de la tarea." }, 400);
    const [created] = await getDb().insert(tasks).values({
      ...parsed.data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }).returning();
    return json(created, 201);
  }

  const parsed = reference.safeParse(body);
  if (!parsed.success) return json({ message: "La referencia de la tarea no es válida." }, 400);

  const { id, revision } = parsed.data;
  const matches = and(eq(tasks.id, id), eq(tasks.revision, revision));
  if (request.method === "DELETE") {
    const [deleted] = await getDb().delete(tasks).where(matches).returning({ id: tasks.id });
    if (deleted) return json(deleted);
  } else {
    const change = z.union([fields, fields.pick({ status: true }).strict()]).safeParse(parsed.data.changes);
    if (!change.success) return json({ message: "Revisa los campos de la tarea." }, 400);
    const [updated] = await getDb().update(tasks)
      .set({ ...change.data, revision: sql`${tasks.revision} + 1` })
      .where(matches).returning();
    if (updated) return json(updated);
  }
  return json({ message: "Esta tarea cambió en otra sesión. Abre la versión actual para continuar." }, 409);
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
