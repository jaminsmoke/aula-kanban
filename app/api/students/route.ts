import { json } from "../../../lib/server/http";
import { listStudents, mutateStudent } from "../../../lib/server/people/students";
import { withProjectRoute } from "../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/** Lista las fichas de alumnos activas del proyecto con su estado de cuenta. */
export const GET = withProjectRoute(async (_request, project) => json(await listStudents(project.id, project.access)));

export { mutateStudent as POST, mutateStudent as PATCH, mutateStudent as DELETE };
