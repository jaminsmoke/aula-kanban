import { getChatGPTUser } from "../../../../lib/server/auth";
import { json } from "../../../../lib/server/http";
import { projectFailureResponse } from "../../../../lib/server/project-http";
import { withResourceProject } from "../../../../lib/server/route-helpers";
import { readUpload } from "../../../../lib/server/storage";

export const dynamic = "force-dynamic";

/**
 * Sirve un fichero subido a los miembros de su proyecto. El id identifica un
 * contenido inmutable, así que la respuesta se puede cachear un año. La URL
 * no lleva `?project`: el acceso se comprueba contra el proyecto del fichero.
 * @param _request - Petición con el identificador del fichero.
 * @param context - Parámetros de la ruta con el identificador.
 * @returns El contenido del fichero o el error correspondiente.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const found = await readUpload(id);
  if (found.status === "storage_unavailable") return json({ message: "El almacenamiento de archivos no está configurado en este despliegue." }, 503);
  if (found.status !== "ok") return json({ message: "Archivo no encontrado." }, 404);
  return withResourceProject(found.row.projectId, async () => new Response(found.object.body, {
    headers: {
      "Content-Type": found.row.mimeType,
      "Content-Length": String(found.row.sizeBytes),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  }));
}
