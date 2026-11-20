import { readBookFile } from "../../../../../lib/server/books";
import { json, storageUnavailable } from "../../../../../lib/server/http";
import { withProjectRoute } from "../../../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/**
 * Sirve el PDF persistido de un libro del catálogo a los miembros de su
 * proyecto. La clave es versionada e inmutable, así que la respuesta se
 * puede cachear un año. La atribución y la licencia viajan en
 * `GET /api/books`, junto a la ficha.
 * @param _request - Petición con el proyecto en la query.
 * @param _project - Proyecto y acceso ya resueltos.
 * @param context - Parámetros de la ruta con el identificador del libro.
 * @returns El contenido del libro o el error correspondiente.
 */
export const GET = withProjectRoute<{ params: Promise<{ id: string }> }>(async (
  _request,
  _project,
  context,
) => {
  const { id } = await context.params;
  const found = await readBookFile(id);
  if (found.status === "storage_unavailable") return storageUnavailable();
  if (found.status !== "ok") return json({ message: "Libro no encontrado." }, 404);
  return new Response(found.object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(found.book.sizeBytes),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});
