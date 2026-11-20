import { z } from "zod";
import { json } from "../../../lib/server/http";
import { accountEmail, studentReference } from "../../../lib/server/people/campos";
import { createStudent, deleteStudent, listStudents, updateStudent } from "../../../lib/server/people/students";
import { withJsonMutation, withProjectRoute } from "../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/** Campos editables de una ficha de alumno; el nombre puede venir vacío al crear. */
const profile = z.object({
  name: z.string().trim().max(80).default(""),
  displayName: z.string().trim().max(80).default(""),
  role: z.string().trim().max(500),
  activities: z.string().trim().max(2000),
  aiHelp: z.string().trim().max(2000),
});
const fields = profile.merge(studentReference).extend({ accountEmail: accountEmail.optional() });

/** Lista las fichas de alumnos activas del proyecto con su estado de cuenta. */
export const GET = withProjectRoute(async (_request, project) => json(await listStudents(project.id, project.access)));

/** Crea una ficha de alumno; con correo, deja la invitación pendiente. */
export const POST = withJsonMutation(withProjectRoute(async (request, project) => {
  if (project.access.role === "student" || project.access.role === "guest") {
    return json({ message: "Solo el profesorado puede crear fichas." }, 403);
  }
  const parsed = profile.extend({ section: z.string().uuid(), accountEmail: accountEmail.optional().default("") })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Revisa los campos del perfil." }, 400);
  const { section, accountEmail: email, ...values } = parsed.data;
  const result = await createStudent(project, { ...values, section, accountEmail: email });
  if (!result.ok) return json({ message: result.message }, result.status);
  return json(result.ficha, 201);
}));

/** Edita una ficha de alumno condicionada a su revisión. */
export const PATCH = withJsonMutation(withProjectRoute(async (request, project) => {
  const parsed = fields.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Revisa los campos del perfil." }, 400);
  const { section, revision, accountEmail: email, ...values } = parsed.data;
  if (project.access.role === "guest" || (project.access.role === "student" && project.access.studentSection !== section)) {
    return json({ message: "Solo puedes editar tu propia ficha." }, 403);
  }
  const result = await updateStudent(project, section, revision, values, email);
  if (!result.ok) return json({ message: result.message }, result.status);
  return json(result.ficha);
}));

/** Elimina una ficha de alumno: pasa al histórico de 30 días. */
export const DELETE = withJsonMutation(withProjectRoute(async (request, project) => {
  const parsed = studentReference.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Revisa los campos del perfil." }, 400);
  const { section, revision } = parsed.data;
  if (project.access.role === "guest" || (project.access.role === "student" && project.access.studentSection !== section)) {
    return json({ message: "Solo puedes editar tu propia ficha." }, 403);
  }
  const result = await deleteStudent(project, section, revision);
  return result.ok ? json({ section }) : json({ message: result.message }, result.status);
}));
