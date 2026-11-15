/**
 * Validación del documento de la app Diagramas.
 *
 * La app guarda `{ code }` en `app_documents`; MCP comprueba la misma forma
 * antes de escribir y conserva el resto de claves internas. No valida la
 * sintaxis de Mermaid ni renderiza el diagrama: eso ocurre en el navegador.
 */

/** Documento de la app Diagramas, con las claves internas conservadas. */
export type DocumentoMermaid = Record<string, unknown> & { code: string };

/**
 * Comprueba que un valor sea un objeto con `code` textual.
 * @param value - Valor recibido de la API o de MCP.
 * @returns El mismo objeto tipado o `null` si no tiene la forma mínima.
 */
export function validarDocumentoMermaid(value: unknown): DocumentoMermaid | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.code !== "string") return null;
  return record as DocumentoMermaid;
}
