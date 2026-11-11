import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projectMembers, projects, students, tasks } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isOwner } from "../project";

export const dynamic = "force-dynamic";
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para acceder a los proyectos." }, 401);
  const owner = isOwner(user);
  const all = await getDb().select().from(projects).orderBy(asc(projects.createdAt), asc(projects.id));
  if (owner) return json({ projects: all.map((project) => ({ ...project, role: "owner", studentSection: null })), isOwner: true });
  const members = await getDb().select().from(projectMembers).where(eq(projectMembers.email, user.email.trim().toLowerCase()));
  return json({ projects: all.flatMap((project) => {
    const member = members.find((item) => item.projectId === project.id);
    return member ? [{ ...project, role: member.role, studentSection: member.studentSection }] : [];
  }), isOwner: false });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !isOwner(user)) return json({ message: "Solo el propietario puede crear proyectos." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato no válido." }, 415);
  const parsed = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Escribe un nombre de hasta 80 caracteres." }, 400);
  const [created] = await getDb().insert(projects).values({ ...parsed.data, createdAt: Date.now() }).onConflictDoNothing().returning();
  if (created) return json(created, 201);
  const [existing] = await getDb().select().from(projects).where(eq(projects.id, parsed.data.id));
  if (existing?.name === parsed.data.name) return json(existing);
  return json({ message: "No se pudo crear el proyecto. Vuelve a intentarlo." }, 409);
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !isOwner(user)) return json({ message: "Solo el propietario puede eliminar proyectos." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato no válido." }, 415);
  const parsed = z.object({ id: z.string().min(1).max(80) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Proyecto no válido." }, 400);
  const db = getDb();
  const [, , , result] = await db.batch([
    db.delete(tasks).where(eq(tasks.projectId, parsed.data.id)),
    db.delete(projectMembers).where(eq(projectMembers.projectId, parsed.data.id)),
    db.delete(students).where(eq(students.projectId, parsed.data.id)),
    db.delete(projects).where(eq(projects.id, parsed.data.id)),
  ]);
  return json({ id: parsed.data.id, deleted: Boolean(result.meta.changes) });
}
