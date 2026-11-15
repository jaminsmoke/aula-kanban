import { json } from "../../../lib/server/http";
import { listTeachers, mutateTeacher } from "../../../lib/server/people/teachers";
import { withProjectRoute } from "../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/** Lista las fichas de profesores del proyecto con su estado de cuenta. */
export const GET = withProjectRoute(async (_request, project) => json(await listTeachers(project.id, project.access)));

export { mutateTeacher as POST, mutateTeacher as PATCH, mutateTeacher as DELETE };
