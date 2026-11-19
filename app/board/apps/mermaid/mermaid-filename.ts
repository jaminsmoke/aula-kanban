import { aulaFileName } from "../../../../lib/domain/aula-documentos/filename";

/**
 * Deriva un nombre de archivo legible para un diagrama Mermaid.
 * @param code - Código del diagrama.
 * @returns Nombre terminado en `.svg`.
 */
export function mermaidFileName(code: string): string {
  const titled = /^\s*(?:%%\s*)?(?:accTitle|title)\s*:\s*(.+)$/im.exec(code)?.[1]?.trim();
  const firstLine = code
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return aulaFileName(titled || firstLine || "", "svg", "diagrama");
}
