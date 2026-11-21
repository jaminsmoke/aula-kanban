/** Error legible de un render Mermaid. */
export type MermaidErrorInfo = {
  summary: string;
  detail: string;
  line: number | null;
};

/**
 * Convierte un error de Mermaid en un resumen y un detalle completos.
 * @param error - Error lanzado por Mermaid.
 * @returns Resumen, detalle y línea si se puede deducir.
 */
export function formatMermaidError(error: unknown): MermaidErrorInfo {
  const raw = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "";
  const detail = raw.trim() || "No se pudo dibujar el diagrama.";
  const lineMatch = /line\s+(\d+)/i.exec(detail);
  const line = lineMatch ? Number(lineMatch[1]) : null;
  return {
    summary: line === null ? "No se pudo dibujar el diagrama." : `No se pudo dibujar el diagrama (línea ${line}).`,
    detail,
    line,
  };
}
