import {
  insertAppDocumentRow,
  selectAppDocumentRow,
  selectAppDocumentUpdatedAt,
  updateAppDocumentRowIfCurrent,
  upsertAppDocumentRow,
  type AppDocumentWrite,
} from "./app-documents-repository";

/** Límite del estado serializado de un documento de app (200 KB). */
export const MAX_APP_DOCUMENT_CHARS = 200_000;

/** Documento guardado de una app en un proyecto. */
export type AppDocument = { state: unknown; updatedAt: number };

/**
 * Lee el documento de una app en la tabla común.
 * @param projectId - Proyecto activo.
 * @param appId - Identificador de la app.
 * @returns El documento o `null` si nunca se guardó.
 */
export async function readAppDocument(projectId: string, appId: string): Promise<AppDocument | null> {
  const row = await selectAppDocumentRow(projectId, appId);
  return row ? { state: JSON.parse(row.state) as unknown, updatedAt: row.updatedAt } : null;
}

/**
 * Guarda (o reemplaza) el documento de una app para el proyecto sin comprobar
 * la versión. Se conserva para los clientes anteriores y las herramientas MCP;
 * la web usa `saveAppDocumentIfCurrent`.
 * @param input - Proyecto, app, estado ya serializado y autor.
 * @returns La fecha de actualización aplicada.
 */
export async function saveAppDocument(input: AppDocumentWrite): Promise<number> {
  return upsertAppDocumentRow(input);
}

/** Resultado de un guardado condicionado a la versión conocida por el cliente. */
export type SaveAppDocumentResult =
  | { status: "saved"; updatedAt: number }
  | { status: "conflict"; updatedAt: number | null };

/**
 * Guarda el documento solo si la versión del servidor sigue siendo la esperada.
 * La comprobación y la escritura se hacen en una sola sentencia para que dos
 * guardados simultáneos no puedan aceptarse ambos.
 * @param input - Proyecto, app, estado serializado, autor y versión esperada.
 * @returns El resultado del guardado y la versión vigente.
 */
export async function saveAppDocumentIfCurrent(input: AppDocumentWrite & { expectedUpdatedAt: number | null }): Promise<SaveAppDocumentResult> {
  const saved = input.expectedUpdatedAt === null
    ? await insertAppDocumentRow(input)
    : await updateAppDocumentRowIfCurrent({ ...input, expectedUpdatedAt: input.expectedUpdatedAt });
  if (saved !== null) return { status: "saved", updatedAt: saved };
  return { status: "conflict", updatedAt: await selectAppDocumentUpdatedAt(input.projectId, input.appId) };
}
