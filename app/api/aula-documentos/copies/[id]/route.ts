import { deleteDocumentCopy, findDocumentCopy } from "../../../../../lib/server/aula-documentos/document-copies";
import { isSameOrigin, json, storageUnavailable } from "../../../../../lib/server/http";
import { projectFailureResponse } from "../../../../../lib/server/projects/project-http";
import { withResourceProject } from "../../../../../lib/server/route-helpers";
import { readUpload } from "../../../../../lib/server/storage";
import { StorageUnavailableError } from "../../../../../lib/server/storage/repository";

export const dynamic = "force-dynamic";

/**
 * Descarga una copia portable con nombre de archivo.
 * @param _request - Petición del miembro del proyecto.
 * @param context - Parámetros de la ruta con el id.
 * @returns El ZIP o el error correspondiente.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const copy = await findDocumentCopy(id);
  if (!copy) return projectFailureResponse("not_found");
  return withResourceProject(copy.projectId, async () => {
    try {
      const upload = await readUpload(id);
      if (upload.status === "storage_unavailable") return storageUnavailable();
      if (upload.status !== "ok" || upload.row.purpose !== "document-copy") {
        return json({ message: "Copia no encontrada." }, 404);
      }
      return new Response(upload.object.body, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Length": String(upload.row.sizeBytes),
          "Content-Disposition": `attachment; filename="aula-copy-${id}.aula.zip"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      return json({ message: "No se pudo descargar la copia." }, 502);
    }
  });
}

/**
 * Borra una copia portable y su objeto de R2.
 * @param request - Petición del miembro con permiso de escritura.
 * @param context - Parámetros de la ruta con el id.
 * @returns La confirmación o el error correspondiente.
 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  const { id } = await context.params;
  const copy = await findDocumentCopy(id);
  if (!copy) return projectFailureResponse("not_found");
  return withResourceProject(copy.projectId, async (_request, project) => {
    if (project.access.role === "guest") {
      return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
    }

    try {
      if (!(await deleteDocumentCopy(id))) return json({ message: "Copia no encontrada." }, 404);
      return new Response(null, { status: 204 });
    } catch (error) {
      if (error instanceof StorageUnavailableError) return storageUnavailable();
      return json({ message: "No se pudo borrar la copia." }, 502);
    }
  });
}
