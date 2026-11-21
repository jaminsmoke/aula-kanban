import { downloadTextFile } from "../../shared/ui/download";

/**
 * Construye el nombre de la descarga del programa.
 * @param projectId - Proyecto activo.
 * @returns Nombre estable del archivo JSON.
 */
function blocklyDownloadFileName(projectId: string): string {
  return `programa-${projectId}.json`;
}

/**
 * Descarga el estado serializado del workspace.
 * @param state - Estado serializado de Blockly.
 * @param projectId - Proyecto activo.
 */
export function downloadBlocklyState(state: Record<string, unknown>, projectId: string) {
  downloadTextFile(JSON.stringify(state, null, 2), "application/json", blocklyDownloadFileName(projectId));
}
