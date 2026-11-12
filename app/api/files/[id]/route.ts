import { getChatGPTUser } from "../../../chatgpt-auth";
import { validProject } from "../../../../lib/server/project";
import { readUpload } from "../../../../lib/server/storage";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Sirve un fichero subido a los miembros de su proyecto.
 * @param request - Petición con el identificador del fichero.
 * @param context - Parámetros de la ruta con el identificador.
 * @returns El contenido del fichero o el error correspondiente.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para acceder al tablero." }, 401);
  const found = await readUpload(id);
  if (!found) return json({ message: "Archivo no encontrado." }, 404);
  const projectRequest = new Request(`http://local/?project=${encodeURIComponent(found.row.projectId)}`);
  const project = await validProject(projectRequest);
  if (!project) return json({ message: "Archivo no encontrado." }, 404);
  return new Response(found.object.body, {
    headers: {
      "Content-Type": found.row.mimeType,
      "Content-Length": String(found.row.sizeBytes),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
