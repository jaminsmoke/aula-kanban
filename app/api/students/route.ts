import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { students } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import initialStudents from "../../students.json";

export const dynamic = "force-dynamic";

const fields = z.object({
  section: z.string().min(1).max(80),
  revision: z.number().int().positive(),
  displayName: z.string().trim().min(1).max(80),
  role: z.string().trim().max(500),
  activities: z.string().trim().max(2000),
  aiHelp: z.string().trim().max(2000),
});

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  if (!(await getChatGPTUser())) return json({ message: "Inicia sesión para acceder a las fichas." }, 401);
  const db = getDb();
  const initial = initialStudents.map((student) => ({
    section: student.section,
    name: student.name,
    displayName: student.name,
    role: (student.details[0] ?? "").replace(/^Puesto de trabajo:\s*/i, ""),
    activities: (student.details[1] ?? "").replace(/^Actividades cotidianas:\s*/i, ""),
    aiHelp: (student.details[2] ?? "").replace(/^Ayuda de la IA:\s*/i, ""),
  }));
  let current = await db.select().from(students).orderBy(asc(students.section));
  const existing = new Set(current.map((student) => student.section));
  const missing = initial.filter((student) => !existing.has(student.section));
  if (missing.length) {
    for (let offset = 0; offset < missing.length; offset += 10) {
      await db.insert(students).values(missing.slice(offset, offset + 10)).onConflictDoNothing();
    }
    current = await db.select().from(students).orderBy(asc(students.section));
  }
  return json(current);
}

export async function PATCH(request: Request) {
  if (!(await getChatGPTUser())) return json({ message: "Inicia sesión para editar las fichas." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ message: "Formato de solicitud no válido." }, 415);
  }
  const parsed = fields.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Revisa los campos del perfil." }, 400);
  const { section, revision, ...changes } = parsed.data;
  const [updated] = await getDb().update(students)
    .set({ ...changes, revision: sql`${students.revision} + 1` })
    .where(and(eq(students.section, section), eq(students.revision, revision))).returning();
  if (!updated) return json({ message: "La ficha ha cambiado en otra sesión. Cierra el formulario y vuelve a abrirla para ver los cambios." }, 409);
  return json(updated);
}
