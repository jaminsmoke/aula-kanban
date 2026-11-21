import { json } from "../../../../../../lib/server/http";
import { withProjectRoute } from "../../../../../../lib/server/route-helpers";
import { getAulaVersion } from "../../../../../../lib/server/aula-documentos/versions";

export const dynamic = "force-dynamic";

type VersionContext = { params: Promise<{ id: string; versionId: string }> };

/**
 * Lee una versión completa para previsualizarla.
 * @param request - Petición del proyecto.
 * @param project - Proyecto autorizado.
 * @param context - Parámetros con documento y versión.
 * @returns La versión o el error.
 */
export const GET = withProjectRoute<VersionContext>(async (_request, project, context) => {
  const { id, versionId } = await context.params;
  const result = await getAulaVersion({
    projectId: project.id,
    documentId: id,
    versionId,
    actor: {
      userId: project.access.user.userId,
      displayName: project.access.user.displayName || project.access.user.fullName || project.access.user.email,
      role: project.access.role,
    },
  });
  if (result.status === "not-found") return json({ message: "Versión no encontrada." }, 404);
  if (result.status === "forbidden") return json({ message: "No puedes consultar el historial." }, 403);
  if (result.status !== "ok") return json({ message: "No se pudo leer la versión." }, 502);
  return json({ version: result.value });
});
