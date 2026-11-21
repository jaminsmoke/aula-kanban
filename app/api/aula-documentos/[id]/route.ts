import { z } from "zod";
import { MAX_APP_DOCUMENT_CHARS } from "../../../../lib/server/apps/app-documents";
import { readAulaDocument, saveAulaDocumentIfCurrent } from "../../../../lib/server/aula-documentos/documents";
import { boundedJson } from "../../../../lib/server/bounded-json";
import { isJsonRequest, isSameOrigin, json } from "../../../../lib/server/http";
import { withProjectRoute } from "../../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

type DocumentContext = { params: Promise<{ id: string }> };

/** Lee un documento completo de la suite. */
export const GET = withProjectRoute<DocumentContext>(async (_request, project, context) => {
  const { id } = await context.params;
  try {
    const document = await readAulaDocument(project.id, id);
    if (!document) return json({ message: "Documento no encontrado." }, 404);
    return json({ document });
  } catch {
    return json({ message: "No se pudo leer el documento." }, 502);
  }
});

const save = withProjectRoute<DocumentContext>(async (request, project, context) => {
  if (project.access.role === "guest") {
    return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  }
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await boundedJson(request, MAX_APP_DOCUMENT_CHARS);
  } catch {
    return json({ message: "Documento no válido o demasiado grande." }, 413);
  }
  const parsed = z.object({
    state: z.unknown(),
    expectedUpdatedAt: z.number().int().nonnegative().nullable().optional(),
  }).strict().safeParse(body);
  if (!parsed.success || parsed.data.state === undefined) {
    return json({ message: "Documento no válido." }, 400);
  }

  const current = await readAulaDocument(project.id, id);
  if (!current) return json({ message: "Documento no encontrado." }, 404);

  const result = await saveAulaDocumentIfCurrent({
    projectId: project.id,
    id,
    state: parsed.data.state,
    updatedByUserId: project.access.user.userId,
    expectedUpdatedAt: parsed.data.expectedUpdatedAt ?? null,
  });
  if (result.status === "saved") return json({ accepted: true, updatedAt: result.updatedAt });
  if (result.status === "conflict") {
    return json({
      accepted: false,
      conflict: true,
      message: "El documento ha cambiado en otra sesión.",
      updatedAt: result.updatedAt,
    }, 409);
  }
  if (result.status === "too-large") return json({ message: "El documento es demasiado grande." }, 413);
  return json({ message: "Documento no válido." }, 400);
});

/**
 * Guarda el estado de un documento con comprobación optimista.
 * La ruta aplica origen y tipo JSON y delega el proyecto al helper común.
 * @param request - Petición JSON del miembro del proyecto.
 * @param context - Parámetros con el id del documento.
 * @returns La versión guardada o el error correspondiente.
 */
export async function POST(request: Request, context: DocumentContext) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  return save(request, context);
}
