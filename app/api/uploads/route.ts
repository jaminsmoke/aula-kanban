import { z } from "zod";
import { isSameOrigin, json, storageUnavailable } from "../../../lib/server/http";
import { withProjectRoute } from "../../../lib/server/route-helpers";
import { storeUpload } from "../../../lib/server/storage";
import { UploadQuotaExceededError, uploadPurposes, validateUpload } from "../../../lib/server/storage/quota";
import { StorageUnavailableError } from "../../../lib/server/storage/repository";

export const dynamic = "force-dynamic";

/** Guarda la subida una vez resueltos el origen y el proyecto. */
const uploadFile = withProjectRoute(async (request, project) => {
  if (project.access.role === "guest") return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const purpose = z.enum(uploadPurposes).safeParse(form?.get("purpose"));
  if (!purpose.success || !(file instanceof File)) return json({ message: "Falta el archivo o la finalidad no es válida." }, 400);
  if (purpose.data === "document-copy") {
    return json({ message: "Las copias portables se guardan desde su ruta específica." }, 400);
  }
  const problem = validateUpload(purpose.data, file.type, file.size);
  if (problem) return json({ message: problem }, 400);
  try {
    const stored = await storeUpload({
      projectId: project.id,
      purpose: purpose.data,
      origin: "web",
      file,
      ownerUserId: project.access.user.userId,
    });
    return json({ ...stored, mimeType: file.type, sizeBytes: file.size }, 201);
  } catch (error) {
    if (error instanceof UploadQuotaExceededError) {
      return json({ message: "La cuota de imágenes del proyecto está llena. Elimina imágenes o descarga el documento antes de añadir más." }, 413);
    }
    if (error instanceof StorageUnavailableError) return storageUnavailable();
    throw error;
  }
});

/**
 * Sube un fichero (imagen o documento) al almacenamiento del proyecto.
 * @param request - Petición multipart con `file` y `purpose`, y el proyecto en la URL.
 * @returns Respuesta JSON con el identificador y la URL interna del fichero.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  return uploadFile(request);
}
