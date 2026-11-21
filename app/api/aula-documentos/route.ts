import { json } from "../../../lib/server/http";
import { withProjectRoute } from "../../../lib/server/route-helpers";
import { listAulaDocumentSuite } from "../../../lib/server/aula-documentos/documents";

export const dynamic = "force-dynamic";

/** Lista los documentos de la suite del proyecto activo. */
export const GET = withProjectRoute(async (_request, project) => {
  try {
    return json(await listAulaDocumentSuite(project.id));
  } catch {
    return json({ message: "No se pudieron leer los documentos del proyecto." }, 502);
  }
});
