/** Tamaño natural de un SVG generado por Mermaid. */
export type MermaidSvgSize = {
  width: number;
  height: number;
};

/** Tamaño disponible para dibujar el SVG. */
export type MermaidCanvasSize = {
  width: number;
  height: number;
};

/**
 * Lee el tamaño natural del SVG, priorizando el `viewBox`.
 * @param svg - SVG serializado por Mermaid.
 * @returns Ancho y alto finitos, o `null` si no se pueden leer.
 */
export function mermaidSvgSize(svg: string): MermaidSvgSize | null {
  const opening = /<svg[^>]*>/i.exec(svg);
  if (!opening) return null;
  const tag = opening[0];
  const viewBox = /viewBox=["']\s*-?[\d.]+\s+-?[\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i.exec(tag);
  if (viewBox) {
    const width = Number(viewBox[1]);
    const height = Number(viewBox[2]);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }

  const widthMatch = /\swidth=["']([\d.]+)(?:px)?["']/i.exec(tag);
  const heightMatch = /\sheight=["']([\d.]+)(?:px)?["']/i.exec(tag);
  if (!widthMatch || !heightMatch) return null;
  const width = Number(widthMatch[1]);
  const height = Number(heightMatch[1]);
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height }
    : null;
}

/**
 * Calcula el zoom inicial que encaja el SVG en el lienzo.
 * @param svgSize - Tamaño natural del SVG.
 * @param canvasSize - Espacio disponible, ya sin padding.
 * @param max - Zoom máximo inicial.
 * @returns Un factor de escala entre `0.02` y `max`, o `1` sin medidas.
 */
export function fitMermaidScale(
  svgSize: MermaidSvgSize | null,
  canvasSize: MermaidCanvasSize | null,
  max = 1,
): number {
  if (!svgSize || !canvasSize) return 1;
  if (svgSize.width <= 0 || svgSize.height <= 0) return 1;
  if (canvasSize.width <= 0 || canvasSize.height <= 0) return 1;
  const limit = Number.isFinite(max) && max > 0 ? max : 1;
  return Math.max(0.02, Math.min(limit, canvasSize.width / svgSize.width, canvasSize.height / svgSize.height));
}
