import { z } from "zod";
import { boundedJson } from "../../../../../../../lib/server/bounded-json";
import { isJsonRequest, isSameOrigin, json } from "../../../../../../../lib/server/http";
import { restoreAulaVersion } from "../../../../../../../lib/server/aula-documentos/versions";
import { withProjectRoute } from "../../../../../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

type RestoreContext = { params: Promise<{ id: string; versionId: string }> };

const restoreSchema = z.object({
  expectedUpdatedAt: z.number().int().nonnegative(),
}).strict();

const handle = withProjectRoute<RestoreContext>(async (request, project, context) => {
  const { id, versionId } = await context.params;
  let payload: unknown;
  try {
    payload = await boundedJson(request, 2_048);
  } catch {
    return json({ message: "Solicitud no válida." }, 400);
  }
  const parsed = restoreSchema.safeParse(payload);
  if (!parsed.success) return json({ message: "Solicitud no válida." }, 400);

  const result = await restoreAulaVersion({
    projectId: project.id,
    documentId: id,
    versionId,
    expectedUpdatedAt: parsed.data.expectedUpdatedAt,
    actor: {
      userId: project.access.user.userId,
      displayName: project.access.user.displayName || project.access.user.fullName || project.access.user.email,
      role: project.access.role,
    },
  });
  if (result.status === "not-found") return json({ message: "Versión no encontrada." }, 404);
  if (result.status === "forbidden") return json({ message: "No puedes restaurar versiones." }, 403);
  if (result.status === "invalid") return json({ message: "La versión no se puede restaurar." }, 400);
  if (result.status === "limit") return json({ message: "El documento alcanzó el límite de versiones." }, 409);
  if (result.status === "conflict") return json({ message: "El documento cambió en otra sesión." }, 409);
  if (result.status !== "ok") return json({ message: "No se pudo restaurar la versión." }, 502);
  return json(result.value);
});

/**
 * Restaura una versión con comprobación optimista.
 * @param request - Petición JSON.
 * @param context - Parámetros con documento y versión.
 * @returns El documento restaurado o el error.
 */export async function POST(request: Request, context: RestoreContext) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  return handle(request, context);
}
