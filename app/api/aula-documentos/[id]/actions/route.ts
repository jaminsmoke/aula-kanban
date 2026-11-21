import { z } from "zod";
import { MAX_APP_DOCUMENT_CHARS } from "../../../../../lib/server/apps/app-documents";
import {
  changeAulaDocumentStatus,
  duplicateAulaDocument,
  renameAulaDocument,
} from "../../../../../lib/server/aula-documentos/documents";
import { boundedJson } from "../../../../../lib/server/bounded-json";
import { isJsonRequest, isSameOrigin, json } from "../../../../../lib/server/http";
import { withProjectRoute } from "../../../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

type ActionContext = { params: Promise<{ id: string }> };

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("duplicate") }),
  z.object({ action: z.literal("rename"), title: z.string() }),
  z.object({ action: z.literal("archive") }),
  z.object({ action: z.literal("delete") }),
  z.object({ action: z.literal("restore") }),
]);

const handle = withProjectRoute<ActionContext>(async (request, project, context) => {
  if (project.access.role === "guest") {
    return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  }
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await boundedJson(request, MAX_APP_DOCUMENT_CHARS);
  } catch {
    return json({ message: "Acción no válida." }, 400);
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return json({ message: "Acción no válida." }, 400);

  if (parsed.data.action === "duplicate") {
    const result = await duplicateAulaDocument(project.id, id, project.access.user.userId);
    if (!result) return json({ message: "Documento no encontrado." }, 404);
    if (result.status === "created") return json({ document: result.document }, 201);
    if (result.status === "too-large") return json({ message: "El documento es demasiado grande." }, 413);
    return json({ message: "No se pudo duplicar el documento." }, 400);
  }

  if (parsed.data.action === "rename") {
    const document = await renameAulaDocument(project.id, id, parsed.data.title, project.access.user.userId);
    if (!document) return json({ message: "Documento no encontrado." }, 404);
    return json({ document });
  }

  const status = parsed.data.action === "restore"
    ? "active"
    : parsed.data.action === "archive" ? "archived" : "deleted";
  const document = await changeAulaDocumentStatus(project.id, id, status, project.access.user.userId);
  if (!document) return json({ message: "Documento no encontrado." }, 404);
  return json({ document });
});

/**
 * Ejecuta una acción de ciclo de vida sobre un documento.
 * @param request - Petición JSON.
 * @param context - Parámetros con el id.
 * @returns El documento actualizado o el error.
 */
export async function POST(request: Request, context: ActionContext) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  return handle(request, context);
}
