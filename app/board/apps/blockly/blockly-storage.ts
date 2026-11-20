import { createLocalState } from "../../../../lib/client-storage";

/** Estado serializable del workspace de Blockly. */
export type BlocklyStoredState = Record<string, unknown>;

/**
 * Construye la clave local del respaldo de Blockly de un proyecto.
 * @param projectId - Proyecto activo.
 * @returns La clave estable de `localStorage`.
 */
export function blocklyStorageKey(projectId: string): string {
  return `aula.blockly.${projectId}`;
}

/**
 * Valida el estado serializado de un workspace.
 * @param value - Valor candidato.
 * @returns El objeto válido o `null`.
 */
export function parseBlocklyState(value: unknown): BlocklyStoredState | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as BlocklyStoredState
    : null;
}

/**
 * Crea el estado local versionado del respaldo de Blockly.
 * @param projectId - Proyecto activo.
 * @returns El estado local listo para leer o escribir.
 */
export function createBlocklyState(projectId: string) {
  return createLocalState<BlocklyStoredState>({
    key: blocklyStorageKey(projectId),
    version: 1,
    validate: parseBlocklyState,
    fallback: () => ({}),
  });
}
