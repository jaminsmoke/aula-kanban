import { readBookImage, type BookImageKind } from "../../../../../lib/server/books/books";
import { json, storageUnavailable } from "../../../../../lib/server/http";
import { withProjectRoute } from "../../../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/**
 * Sirve la imagen de portada o contraportada de un libro del catálogo a
 * los miembros de su proyecto. Las claves son versionadas e inmutables,
 * así que la respuesta se puede cachear un año.
 * @param request - Petición con el proyecto y el tipo de imagen en la query.
 * @param _project - Proyecto y acceso ya resueltos.
 * @param context - Parámetros de la ruta con el identificador del libro.
 * @returns La imagen o el error correspondiente.
 */
export const GET = withProjectRoute<{ params: Promise<{ id: string }> }>(async (
  request,
  _project,
  context,
) => {
  const { id } = await context.params;
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "cover" && kind !== "back") return json({ message: "Tipo de imagen no válido." }, 400);
  const found = await readBookImage(id, kind as BookImageKind);
  if (found.status === "storage_unavailable") return storageUnavailable();
  if (found.status !== "ok") return json({ message: "Imagen no encontrada." }, 404);
  return new Response(found.object.body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(found.object.size),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});
