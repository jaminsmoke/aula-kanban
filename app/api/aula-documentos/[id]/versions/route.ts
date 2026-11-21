import { z } from "zod";
import { boundedJson } from "../../../../../lib/server/bounded-json";
import { isJsonRequest, isSameOrigin, json } from "../../../../../lib/server/http";
import { withProjectRoute } from "../../../../../lib/server/route-helpers";
import { createAulaVersion, listAulaVersions } from "../../../../../lib/server/aula-documentos/versions";

export const dynamic = "force-dynamic";

type VersionsContext = { params: Promise<{ id: string }> };

/**
 * Lista las versiones del documento.
 * @param request - Petición del proyecto.
 * @param project - Proyecto autorizado.
 * @param context - Parámetros con el documento.
 * @returns Versiones y total o el error.
 */
export const GET = withProjectRoute<VersionsContext>(async (_request, project, context) => {
  const { id } = await context.params;
  const result = await listAulaVersions({
    projectId: project.id,
    documentId: id,
    actor: {
      userId: project.access.user.userId,
      displayName: project.access.user.displayName || project.access.user.fullName || project.access.user.email,
      role: project.access.role,
    },
  });
  if (result.status === "not-found") return json({ message: "Documento no encontrado." }, 404);
  if (result.status === "forbidden") return json({ message: "No puedes consultar el historial." }, 403);
  if (result.status !== "ok") return json({ message: "No se pudo leer el historial." }, 502);
  return json(result.value);
});

const createSchema = z.object({ name: z.unknown().optional() }).strict();

const handlePost = withProjectRoute<VersionsContext>(async (request, project, context) => {
  const { id } = await context.params;
  let payload: unknown;
  try {
    payload = await boundedJson(request, 4_096);
  } catch {
    return json({ message: "Versión no válida." }, 413);
  }
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) return json({ message: "Versión no válida." }, 400);
  const result = await createAulaVersion({
    projectId: project.id,
    documentId: id,
    name: parsed.data.name,
    actor: {
      userId: project.access.user.userId,
      displayName: project.access.user.displayName || project.access.user.fullName || project.access.user.email,
      role: project.access.role,
    },
  });
  if (result.status === "not-found") return json({ message: "Documento no encontrado." }, 404);
  if (result.status === "forbidden") return json({ message: "No puedes crear versiones." }, 403);
  if (result.status === "invalid") return json({ message: "El documento no se puede versionar." }, 400);
  if (result.status === "limit") return json({ message: "El documento alcanzó el límite de versiones." }, 409);
  if (result.status !== "ok") return json({ message: "No se pudo crear la versión." }, 502);
  return json({ version: result.value }, 201);
});

/**
 * Crea una versión manual del documento.
 * @param request - Petición JSON.
 * @param context - Parámetros con el documento.
 * @returns La versión o el error.
 */
export async function POST(request: Request, context: VersionsContext) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  return handlePost(request, context);
}
