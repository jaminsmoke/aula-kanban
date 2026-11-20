import { z } from "zod";
import { json } from "../../../lib/server/http";
import { accountEmail, teacherReference } from "../../../lib/server/people/campos";
import { createTeacher, deleteTeacher, listTeachers, updateTeacher } from "../../../lib/server/people/teachers";
import { withJsonMutation, withProjectRoute } from "../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/** Campos editables de una ficha de profesor; el nombre es obligatorio. */
const fields = z.object({
  name: z.string().trim().min(1).max(80),
  displayName: z.string().trim().max(80).default(""),
  role: z.string().trim().max(500),
  activities: z.string().trim().max(2000),
  aiHelp: z.string().trim().max(2000),
});

/** Lista las fichas de profesorado del proyecto con su estado de cuenta. */
export const GET = withProjectRoute(async (_request, project) => json(await listTeachers(project.id, project.access)));

/** Crea una ficha de profesor; con correo, deja la invitación pendiente. */
export const POST = withJsonMutation(withProjectRoute(async (request, project) => {
  if (project.access.role === "student" || project.access.role === "guest") {
    return json({ message: "No tienes permiso para gestionar fichas de profesores." }, 403);
  }
  if (project.access.role === "teacher") return json({ message: "Solo un administrador puede añadir profesores." }, 403);
  const parsed = fields.extend({ id: z.string().uuid(), accountEmail: accountEmail.optional().default("") })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Revisa los campos de la ficha." }, 400);
  const { id, accountEmail: email, ...values } = parsed.data;
  const result = await createTeacher(project, { ...values, id, accountEmail: email });
  if (!result.ok) return json({ message: result.message }, result.status);
  return json(result.ficha, 201);
}));

/** Edita una ficha de profesor condicionada a su revisión. */
export const PATCH = withJsonMutation(withProjectRoute(async (request, project) => {
  if (project.access.role === "student" || project.access.role === "guest") {
    return json({ message: "No tienes permiso para gestionar fichas de profesores." }, 403);
  }
  const parsed = fields.merge(teacherReference).extend({ accountEmail: accountEmail.optional() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const { id, revision, accountEmail: email, ...values } = parsed.data;
  if (project.access.role === "teacher" && project.access.teacherId !== id) {
    return json({ message: "Solo puedes gestionar tu propia ficha de profesor." }, 403);
  }
  const result = await updateTeacher(project, id, revision, values, email);
  if (!result.ok) return json({ message: result.message }, result.status);
  return json(result.ficha);
}));

/** Elimina una ficha de profesor: pasa al histórico de 30 días. */
export const DELETE = withJsonMutation(withProjectRoute(async (request, project) => {
  if (project.access.role === "student" || project.access.role === "guest") {
    return json({ message: "No tienes permiso para gestionar fichas de profesores." }, 403);
  }
  const parsed = teacherReference.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const { id, revision } = parsed.data;
  if (project.access.role === "teacher" && project.access.teacherId !== id) {
    return json({ message: "Solo puedes gestionar tu propia ficha de profesor." }, 403);
  }
  const result = await deleteTeacher(project, id, revision);
  return result.ok ? json({ id }) : json({ message: result.message }, result.status);
}));
