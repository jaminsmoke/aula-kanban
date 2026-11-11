import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projectMembers, projects } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  const user = await getChatGPTUser(); if (!user) return json({ message: "Inicia sesión." }, 401);
  const rows = await getDb().select({ id: projectMembers.id, projectId: projects.id, projectName: projects.name, role: projectMembers.role }).from(projectMembers).innerJoin(projects, eq(projects.id, projectMembers.projectId)).where(and(eq(projectMembers.email, user.email.trim().toLowerCase()), eq(projectMembers.status, "pending")));
  return json(rows);
}
export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return json({ message: "Inicia sesión." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato no válido." }, 415);
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Invitación no válida." }, 400);
  try {
    const [row] = await getDb().update(projectMembers).set({ status: "active", userId: user.userId }).where(and(eq(projectMembers.id, parsed.data.id), eq(projectMembers.email, user.email.trim().toLowerCase()), eq(projectMembers.status, "pending"))).returning({ projectId: projectMembers.projectId });
    return row ? json(row) : json({ message: "La invitación ya no está disponible para esta cuenta." }, 404);
  } catch { return json({ message: "No se pudo aceptar la invitación. Es posible que tu cuenta ya pertenezca al proyecto." }, 409); }
}
