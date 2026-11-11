import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projectMembers, students } from "../../../db/schema";
import { validProject } from "../project";

export const dynamic = "force-dynamic";
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const project = await validProject(request);
  if (!project || project.access.role === "student") return json({ message: "No tienes permiso para gestionar miembros." }, 403);
  return json(await getDb().select().from(projectMembers).where(eq(projectMembers.projectId, project.id)).orderBy(asc(projectMembers.email)));
}

export async function POST(request: Request) {
  const project = await validProject(request);
  if (!project || project.access.role === "student") return json({ message: "No tienes permiso para gestionar miembros." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato no válido." }, 415);
  const input = z.object({
    email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
    role: z.enum(["teacher", "student"]),
    studentSection: z.string().min(1).max(80).nullable(),
  }).safeParse(await request.json().catch(() => null));
  if (!input.success) return json({ message: "Revisa el correo y el rol." }, 400);
  const values = input.data;
  if (values.studentSection) {
    const [student] = await getDb().select().from(students).where(and(eq(students.section, values.studentSection), eq(students.projectId, project.id), eq(students.deleted, 0)));
    if (!student) return json({ message: "La ficha seleccionada no está disponible." }, 400);
  }
  try {
    const [member] = await getDb().insert(projectMembers).values({
      id: crypto.randomUUID(), projectId: project.id, ...values,
    }).onConflictDoUpdate({
      target: [projectMembers.projectId, projectMembers.email],
      set: { role: values.role, studentSection: values.studentSection },
    }).returning();
    return json(member);
  } catch {
    return json({ message: "Esa ficha ya está vinculada a otra cuenta o el proyecto dejó de estar disponible." }, 409);
  }
}

export async function DELETE(request: Request) {
  const project = await validProject(request);
  if (!project || project.access.role === "student") return json({ message: "No tienes permiso para gestionar miembros." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato no válido." }, 415);
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Miembro no válido." }, 400);
  const [deleted] = await getDb().delete(projectMembers).where(and(eq(projectMembers.id, parsed.data.id), eq(projectMembers.projectId, project.id))).returning();
  return deleted ? json({ id: deleted.id }) : json({ message: "Ese miembro ya no está disponible." }, 404);
}
