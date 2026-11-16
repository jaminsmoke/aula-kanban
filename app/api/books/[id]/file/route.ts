import { getChatGPTUser } from "../../../../../lib/server/auth";
import { projectFailureResponse } from "../../../../../lib/server/project-http";
import { resolveProject } from "../../../../../lib/server/project-access";
import { readBookFile } from "../../../../../lib/server/books";
import { json } from "../../../../../lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Sirve el PDF persistido de un libro del catálogo a los miembros de su
 * proyecto. La clave es versionada e inmutable, así que la respuesta se
 * puede cachear un año. La atribución y la licencia viajan en
 * `GET /api/books`, junto a la ficha.
 * @param request - Petición con el proyecto en la query.
 * @param context - Parámetros de la ruta con el identificador del libro.
 * @returns El contenido del libro o el error correspondiente.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const found = await readBookFile(id);
  if (found.status === "storage_unavailable") return json({ message: "El almacenamiento de archivos no está configurado en este despliegue." }, 503);
  if (found.status !== "ok") return json({ message: "Libro no encontrado." }, 404);
  return new Response(found.object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(found.book.sizeBytes),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
