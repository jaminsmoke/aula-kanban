import { z } from "zod";
import { MAX_APP_DOCUMENT_CHARS } from "../../../lib/server/apps/app-documents";
import { createAulaDocument, listAulaDocumentSuite } from "../../../lib/server/aula-documentos/documents";
import { boundedJson } from "../../../lib/server/bounded-json";
import { json } from "../../../lib/server/http";
import { withJsonMutation, withProjectRoute } from "../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/** Lista los documentos de la suite del proyecto activo. */
export const GET = withProjectRoute(async (_request, project) => {
  try {
    return json(await listAulaDocumentSuite(project.id));
  } catch {
    return json({ message: "No se pudieron leer los documentos del proyecto." }, 502);
  }
});

/** Crea un documento en la suite del proyecto activo. */
export const POST = withJsonMutation(withProjectRoute(async (request, project) => {
  if (project.access.role === "guest") {
    return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  }
  let body: unknown;
  try {
    body = await boundedJson(request, MAX_APP_DOCUMENT_CHARS);
  } catch {
    return json({ message: "Documento no válido o demasiado grande." }, 413);
  }
  const parsed = z.object({
    title: z.string().optional(),
    state: z.unknown().optional(),
  }).strict().safeParse(body);
  if (!parsed.success) return json({ message: "Documento no válido." }, 400);

  const result = await createAulaDocument({
    projectId: project.id,
    title: parsed.data.title,
    state: parsed.data.state,
    createdBy: project.access.user.userId,
  });
  if (result.status === "created") return json({ document: result.document }, 201);
  if (result.status === "too-large") return json({ message: "El documento es demasiado grande." }, 413);
  return json({ message: "Documento no válido." }, 400);
}));
