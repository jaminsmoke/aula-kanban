import { z } from "zod";
import { projectFailureResponse } from "../../../lib/server/project-http";
import { resolveProject } from "../../../lib/server/project-access";
import { StorageUnavailableError, storeUpload, uploadPurposes, validateUpload } from "../../../lib/server/storage";
import { isSameOrigin, json } from "../../../lib/server/http";

export const dynamic = "force-dynamic";


/**
 * Sube un fichero (imagen o documento) al almacenamiento del proyecto.
 * @param request - Petición multipart con `file` y `purpose`, y el proyecto en la URL.
 * @returns Respuesta JSON con el identificador y la URL interna del fichero.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const project = resolved.project;
  const user = project.access.user;
  if (project.access.role === "guest") return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const purpose = z.enum(uploadPurposes).safeParse(form?.get("purpose"));
  if (!purpose.success || !(file instanceof File)) return json({ message: "Falta el archivo o la finalidad no es válida." }, 400);
  const problem = validateUpload(purpose.data, file.type, file.size);
  if (problem) return json({ message: problem }, 400);
  try {
    const stored = await storeUpload({ projectId: project.id, purpose: purpose.data, file, ownerUserId: user.userId });
    return json({ ...stored, mimeType: file.type, sizeBytes: file.size }, 201);
  } catch (error) {
    if (error instanceof StorageUnavailableError) return json({ message: "La subida de archivos aún no está habilitada en este despliegue. Usa una URL externa de momento." }, 503);
    throw error;
  }
}
