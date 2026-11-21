import { z } from "zod";
import { boundedJson } from "../../../../../../lib/server/bounded-json";
import { isJsonRequest, isSameOrigin, json } from "../../../../../../lib/server/http";
import { updateAulaComment } from "../../../../../../lib/server/aula-documentos/comments";
import { withProjectRoute } from "../../../../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

type CommentContext = { params: Promise<{ id: string; commentId: string }> };

const updateSchema = z.object({
  action: z.enum(["edit", "resolve", "reopen", "delete"]),
  body: z.unknown().optional(),
  expectedUpdatedAt: z.number().int().nonnegative(),
}).strict();

const handle = withProjectRoute<CommentContext>(async (request, project, context) => {
  const { id, commentId } = await context.params;
  let payload: unknown;
  try {
    payload = await boundedJson(request, 8_192);
  } catch {
    return json({ message: "Comentario no válido o demasiado grande." }, 413);
  }
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return json({ message: "Acción no válida." }, 400);

  const result = await updateAulaComment({
    projectId: project.id,
    documentId: id,
    commentId,
    action: parsed.data.action,
    body: parsed.data.body,
    expectedUpdatedAt: parsed.data.expectedUpdatedAt,
    actor: {
      userId: project.access.user.userId,
      displayName: project.access.user.displayName || project.access.user.fullName || project.access.user.email,
      role: project.access.role,
    },
  });
  if (result.status === "not-found") return json({ message: "Comentario no encontrado." }, 404);
  if (result.status === "forbidden") return json({ message: "No puedes modificar este comentario." }, 403);
  if (result.status === "invalid") return json({ message: "Comentario no válido." }, 400);
  if (result.status === "limit") return json({ message: "El documento alcanzó el límite de comentarios." }, 409);
  if (result.status === "conflict") return json({ message: "El comentario cambió en otra sesión." }, 409);
  if (result.status !== "ok") return json({ message: "No se pudo actualizar el comentario." }, 502);
  return json({ comment: result.value });
});

/**
 * Edita, resuelve, reabre o borra un comentario.
 * @param request - Petición JSON.
 * @param context - Parámetros con documento y comentario.
 * @returns El comentario actualizado o el error.
 */
export async function PATCH(request: Request, context: CommentContext) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  return handle(request, context);
}
