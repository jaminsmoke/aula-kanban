/**
 * Validación mínima de la serialización de Blockly.
 *
 * La app guarda el resultado de `Blockly.serialization.workspaces.save` en
 * `app_documents`. MCP no interpreta los bloques ni genera código: solo
 * comprueba que el objeto tenga la forma mínima que Blockly espera y conserva
 * el resto de campos internos.
 */

/** Estado serializado de un workspace de Blockly. */
export type EstadoBlockly = Record<string, unknown> & {
  blocks: Record<string, unknown> & { blocks: unknown[] };
};

/**
 * Comprueba que un valor sea un objeto con `blocks.blocks[]`.
 * @param value - Valor recibido de la API o de MCP.
 * @returns El mismo objeto tipado o `null` si no tiene la forma mínima.
 */
export function validarEstadoBlockly(value: unknown): EstadoBlockly | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const blocks = record.blocks;
  if (!blocks || typeof blocks !== "object" || Array.isArray(blocks)) return null;
  if (!Array.isArray((blocks as Record<string, unknown>).blocks)) return null;
  return record as EstadoBlockly;
}

/**
 * Interpreta y valida una serialización JSON de Blockly.
 * @param raw - Texto JSON recibido por MCP o por la API.
 * @returns El estado validado o `null` si el JSON no tiene la forma mínima.
 */
export function leerEstadoBlockly(raw: string): EstadoBlockly | null {
  try {
    return validarEstadoBlockly(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
