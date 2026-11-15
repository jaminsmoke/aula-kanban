import { getChatGPTUser } from "../../../../lib/server/auth";
import { projectFailureResponse, resolveProject } from "../../../../lib/server/project-access";
import { readUpload } from "../../../../lib/server/storage";
import { json } from "../../../../lib/server/http";

export const dynamic = "force-dynamic";


/**
 * Sirve un fichero subido a los miembros de su proyecto.
 * @param request - Petición con el identificador del fichero.
 * @param context - Parámetros de la ruta con el identificador.
 * @returns El contenido del fichero o el error correspondiente.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const found = await readUpload(id);
  if (found.status === "storage_unavailable") return json({ message: "El almacenamiento de archivos no está configurado en este despliegue." }, 503);
  if (found.status !== "ok") return json({ message: "Archivo no encontrado." }, 404);
  const projectRequest = new Request(`http://local/?project=${encodeURIComponent(found.row.projectId)}`);
  const resolved = await resolveProject(projectRequest);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  return new Response(found.object.body, {
    headers: {
      "Content-Type": found.row.mimeType,
      "Content-Length": String(found.row.sizeBytes),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
