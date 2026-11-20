import { inspectAulaDocumentCopy, AULA_COPY_MAX_ZIP_BYTES } from "../../../../lib/domain/aula-documentos/copy";
import { createDocumentCopy, listDocumentCopies, type DocumentCopyRow } from "../../../../lib/server/document-copies";
import { isSameOrigin, json, storageUnavailable } from "../../../../lib/server/http";
import { withProjectRoute } from "../../../../lib/server/route-helpers";
import { deleteUpload, storeUpload } from "../../../../lib/server/storage";
import { DocumentCopyLimitExceededError, DocumentCopyQuotaExceededError, validateUpload } from "../../../../lib/server/storage/quota";
import { StorageUnavailableError } from "../../../../lib/server/storage/repository";

export const dynamic = "force-dynamic";

/**
 * Devuelve la representación pública de una copia.
 * @param row - Fila de metadatos.
 * @param currentUserId - Cuenta que consulta la lista.
 * @returns Datos para la lista sin la clave de R2.
 */
function copyJson(row: DocumentCopyRow, currentUserId: string) {
  return {
    id: row.id,
    title: row.title,
    format: row.format,
    formatVersion: row.formatVersion,
    schemaVersion: row.schemaVersion,
    sizeBytes: row.sizeBytes,
    author: row.ownerUserId
      ? row.ownerUserId === currentUserId ? "Tú" : "Otro miembro"
      : "Sin autor",
    createdAt: row.createdAt,
    downloadUrl: `/api/aula-documentos/copies/${row.id}`,
  };
}

/** Lista las copias portables del proyecto activo. */
export const GET = withProjectRoute(async (_request, project) => {
  try {
    const rows = await listDocumentCopies(project.id);
    return json({ copies: rows.map((row) => copyJson(row, project.access.user.userId)) });
  } catch {
    return json({ message: "No se pudieron leer las copias del proyecto." }, 502);
  }
});

/** Guarda una copia portable ya validada en R2, con el proyecto ya resuelto. */
const saveCopy = withProjectRoute(async (request, project) => {
  const user = project.access.user;
  if (project.access.role === "guest") {
    return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > AULA_COPY_MAX_ZIP_BYTES) {
    return json({ message: "La copia supera el tamaño máximo permitido." }, 413);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ message: "Falta el archivo de la copia." }, 400);
  const problem = validateUpload("document-copy", file.type, file.size);
  if (problem) return json({ message: problem }, 400);

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return json({ message: "No se pudo leer la copia." }, 400);
  }
  const inspected = await inspectAulaDocumentCopy(bytes);
  if (!inspected.ok) return json({ message: inspected.message }, 400);

  try {
    const stored = await storeUpload({
      projectId: project.id,
      purpose: "document-copy",
      origin: "web",
      file,
      ownerUserId: user.userId,
    });
    try {
      const copy = await createDocumentCopy({
        id: stored.id,
        projectId: project.id,
        title: inspected.manifest.title,
        formatVersion: inspected.manifest.formatVersion,
        schemaVersion: inspected.manifest.schemaVersion,
        sizeBytes: file.size,
        ownerUserId: user.userId,
        createdAt: Date.now(),
      });
      return json({ copy: copyJson(copy, user.userId) }, 201);
    } catch {
      // El objeto ya está en R2; si no se puede registrar, se retira para no
      // dejar una copia invisible que consuma cuota.
      await deleteUpload(stored.id).catch(() => {});
      return json({ message: "No se pudo registrar la copia." }, 502);
    }
  } catch (error) {
    if (error instanceof DocumentCopyQuotaExceededError) {
      return json({ message: "La cuota de copias del proyecto está llena. Borra una copia antes de guardar otra." }, 413);
    }
    if (error instanceof DocumentCopyLimitExceededError) {
      return json({ message: "El proyecto alcanzó el máximo de copias guardadas. Borra una antes de guardar otra." }, 409);
    }
    if (error instanceof StorageUnavailableError) return storageUnavailable();
    return json({ message: "No se pudo guardar la copia." }, 502);
  }
});

/**
 * Guarda una copia portable ya validada en R2.
 * @param request - Petición multipart con `file` ZIP.
 * @returns La copia creada o el error correspondiente.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  return saveCopy(request);
}
