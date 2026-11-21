import { z } from "zod";
import { boundedJson } from "../../../../../lib/server/bounded-json";
import { isJsonRequest, isSameOrigin, json } from "../../../../../lib/server/http";
import { withProjectRoute } from "../../../../../lib/server/route-helpers";
import { createAulaComment, listAulaComments } from "../../../../../lib/server/aula-documentos/comments";

export const dynamic = "force-dynamic";

type CommentsContext = { params: Promise<{ id: string }> };

/**
 * Lista los hilos de comentarios del documento.
 * @param request - Petición del miembro del proyecto.
 * @param project - Proyecto autorizado.
 * @param context - Parámetros con el id del documento.
 * @returns Hilos y total, o el error correspondiente.
 */
export const GET = withProjectRoute<CommentsContext>(async (_request, project, context) => {
  const { id } = await context.params;
  const result = await listAulaComments({
    projectId: project.id,
    documentId: id,
    actor: {
      userId: project.access.user.userId,
      displayName: project.access.user.displayName || project.access.user.fullName || project.access.user.email,
      role: project.access.role,
    },
  });
  if (result.status === "not-found") return json({ message: "Documento no encontrado." }, 404);
  if (result.status !== "ok") return json({ message: "No se pudieron leer los comentarios." }, 502);
  return json(result.value);
});

const createSchema = z.object({
  body: z.unknown(),
  parentId: z.string().min(1).max(100).nullable().optional(),
  anchor: z.unknown(),
}).strict();

const handlePost = withProjectRoute<CommentsContext>(async (request, project, context) => {
  const { id } = await context.params;
  let payload: unknown;
  try {
    payload = await boundedJson(request, 16_384);
  } catch {
    return json({ message: "Comentario no válido o demasiado grande." }, 413);
  }
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) return json({ message: "Comentario no válido." }, 400);

  const result = await createAulaComment({
    projectId: project.id,
    documentId: id,
    parentId: parsed.data.parentId ?? null,
    body: parsed.data.body,
    anchor: parsed.data.anchor,
    actor: {
      userId: project.access.user.userId,
      displayName: project.access.user.displayName || project.access.user.fullName || project.access.user.email,
      role: project.access.role,
    },
  });
  if (result.status === "not-found") return json({ message: "Documento no encontrado." }, 404);
  if (result.status === "forbidden") return json({ message: "No puedes comentar este documento." }, 403);
  if (result.status === "invalid") return json({ message: "Comentario o ancla no válidos." }, 400);
  if (result.status === "limit") return json({ message: "El documento alcanzó el límite de comentarios." }, 409);
  if (result.status !== "ok") return json({ message: "No se pudo crear el comentario." }, 502);
  return json({ comment: result.value }, 201);
});

/**
 * Crea un comentario o una respuesta.
 * @param request - Petición JSON.
 * @param context - Parámetros con el documento.
 * @returns El comentario creado o el error.
 */
export async function POST(request: Request, context: CommentsContext) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  return handlePost(request, context);
}
