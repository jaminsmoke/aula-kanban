import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { students } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import initialStudents from "../../students.json";
import { defaultProjectId, validProject } from "../project";

export const dynamic = "force-dynamic";

const profile = z.object({
  displayName: z.string().trim().min(1).max(80),
  role: z.string().trim().max(500),
  activities: z.string().trim().max(2000),
  aiHelp: z.string().trim().max(2000),
});
const reference = z.object({ section: z.string().min(1).max(80), revision: z.number().int().positive() });
const fields = profile.merge(reference);

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!(await getChatGPTUser())) return json({ message: "Inicia sesión para acceder a las fichas." }, 401);
  const project = await validProject(request);
  if (!project) return json({ message: "No se encuentra el proyecto." }, 404);
  const db = getDb();
  const initial = initialStudents.map((student) => ({
    section: student.section,
    name: student.name,
    displayName: student.name,
    role: (student.details[0] ?? "").replace(/^Puesto de trabajo:\s*/i, ""),
    activities: (student.details[1] ?? "").replace(/^Actividades cotidianas:\s*/i, ""),
    aiHelp: (student.details[2] ?? "").replace(/^Ayuda de la IA:\s*/i, ""),
  }));
  let current = await db.select().from(students).where(eq(students.projectId, project.id)).orderBy(asc(students.section));
  const existing = new Set(current.map((student) => student.section));
  const missing = project.id === defaultProjectId ? initial.filter((student) => !existing.has(student.section)) : [];
  if (missing.length) {
    for (let offset = 0; offset < missing.length; offset += 10) {
      await db.insert(students).values(missing.slice(offset, offset + 10)).onConflictDoNothing();
    }
    current = await db.select().from(students).where(eq(students.projectId, project.id)).orderBy(asc(students.section));
  }
  return json(current.filter((student) => student.deleted === 0));
}

async function mutate(request: Request) {
  if (!(await getChatGPTUser())) return json({ message: "Inicia sesión para editar las fichas." }, 401);
  const project = await validProject(request);
  if (!project) return json({ message: "No se encuentra el proyecto." }, 404);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ message: "Formato de solicitud no válido." }, 415);
  }
  const body = await request.json().catch(() => null);
  if (request.method === "POST") {
    if (project.access.role === "student") return json({ message: "Solo el profesorado puede crear fichas." }, 403);
    const parsed = profile.extend({ section: z.string().uuid() }).safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los campos del perfil." }, 400);
    const { section, ...values } = parsed.data;
    const [created] = await getDb().insert(students).values({
      ...values, section, projectId: project.id, name: values.displayName,
    }).onConflictDoNothing().returning();
    if (created) return json(created, 201);
    const [existing] = await getDb().select().from(students).where(eq(students.section, section));
    if (existing && existing.projectId === project.id && existing.deleted === 0 && existing.name === values.displayName && existing.revision === 1 && existing.role === values.role && existing.activities === values.activities && existing.aiHelp === values.aiHelp) return json(existing);
    return json({ message: "Esta ficha ya cambió. Cierra el formulario y vuelve a intentarlo." }, 409);
  }
  const parsed = (request.method === "DELETE" ? reference : fields).safeParse(body);
  if (!parsed.success) return json({ message: "Revisa los campos del perfil." }, 400);
  const { section, revision, ...changes } = parsed.data;
  if (project.access.role === "student" && project.access.studentSection !== section) {
    return json({ message: "Solo puedes editar tu propia ficha." }, 403);
  }
  const [updated] = await getDb().update(students)
    .set({ ...changes, ...(request.method === "DELETE" ? { deleted: 1, name: "", displayName: "", role: "", activities: "", aiHelp: "" } : {}), revision: sql`${students.revision} + 1` })
    .where(and(eq(students.section, section), eq(students.revision, revision), eq(students.deleted, 0), eq(students.projectId, project.id))).returning();
  if (!updated) return json({ message: "La ficha ha cambiado en otra sesión. Cierra el formulario y vuelve a abrirla para ver los cambios." }, 409);
  return json(updated);
}

export { mutate as POST, mutate as PATCH, mutate as DELETE };
