import { deleteDocumentCopy, findDocumentCopy } from "../../../../../lib/server/document-copies";
import { isSameOrigin, json } from "../../../../../lib/server/http";
import { projectFailureResponse } from "../../../../../lib/server/project-http";
import { resolveProject } from "../../../../../lib/server/project-access";
import { StorageUnavailableError, readUpload } from "../../../../../lib/server/storage";

export const dynamic = "force-dynamic";

/**
 * Comprueba que la copia pertenece al proyecto indicado por la sesión.
 * @param id - Identificador de la copia.
 * @returns La fila y el proyecto, o el fallo HTTP.
 */
async function copyContext(id: string) {
  const copy = await findDocumentCopy(id);
  if (!copy) return { status: "not_found" as const };
  const resolved = await resolveProject(new Request(`http://local/?project=${encodeURIComponent(copy.projectId)}`));
  if (resolved.status !== "ok") return { status: resolved.status };
  return { status: "ok" as const, copy, project: resolved.project };
}

/**
 * Descarga una copia portable con nombre de archivo.
 * @param _request - Petición del miembro del proyecto.
 * @param context - Parámetros de la ruta con el id.
 * @returns El ZIP o el error correspondiente.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const found = await copyContext(id);
  if (found.status !== "ok") return projectFailureResponse(found.status);

  try {
    const upload = await readUpload(id);
    if (upload.status === "storage_unavailable") {
      return json({ message: "El almacenamiento de copias no está configurado en este despliegue." }, 503);
    }
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
  const found = await copyContext(id);
  if (found.status !== "ok") return projectFailureResponse(found.status);
  if (found.project.access.role === "guest") {
    return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  }

  try {
    if (!(await deleteDocumentCopy(id))) return json({ message: "Copia no encontrada." }, 404);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      return json({ message: "El almacenamiento de copias no está configurado en este despliegue." }, 503);
    }
    return json({ message: "No se pudo borrar la copia." }, 502);
  }
}
