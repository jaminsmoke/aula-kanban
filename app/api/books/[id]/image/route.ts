import { getChatGPTUser } from "../../../../../lib/server/auth";
import { projectFailureResponse } from "../../../../../lib/server/project-http";
import { resolveProject } from "../../../../../lib/server/project-access";
import { readBookImage, type BookImageKind } from "../../../../../lib/server/books";
import { json } from "../../../../../lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Sirve la imagen de portada o contraportada de un libro del catálogo a
 * los miembros de su proyecto. Las claves son versionadas e inmutables,
 * así que la respuesta se puede cachear un año.
 * @param request - Petición con el proyecto y el tipo de imagen en la query.
 * @param context - Parámetros de la ruta con el identificador del libro.
 * @returns La imagen o el error correspondiente.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "cover" && kind !== "back") return json({ message: "Tipo de imagen no válido." }, 400);
  const found = await readBookImage(id, kind as BookImageKind);
  if (found.status === "storage_unavailable") return json({ message: "El almacenamiento de archivos no está configurado en este despliegue." }, 503);
  if (found.status !== "ok") return json({ message: "Imagen no encontrada." }, 404);
  return new Response(found.object.body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(found.object.size),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
