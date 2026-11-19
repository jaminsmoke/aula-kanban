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

/** Punto dentro del lienzo, relativo a su esquina superior izquierda. */
export type MermaidPoint = { x: number; y: number };

/** Desplazamiento del lienzo respecto al centro del contenedor. */
export type MermaidPan = { x: number; y: number };

/** Límites de zoom de la vista interactiva. */
export const MERMAID_MIN_ZOOM = 0.05;
export const MERMAID_MAX_ZOOM = 4;

/**
 * Limita el zoom interactivo a un rango usable.
 * @param scale - Escala propuesta.
 * @returns La escala limitada.
 */
export function clampMermaidZoom(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.max(MERMAID_MIN_ZOOM, Math.min(MERMAID_MAX_ZOOM, scale));
}

/**
 * Calcula el tamaño visual del escenario para una escala.
 * @param svgSize - Tamaño natural del SVG.
 * @param scale - Escala aplicada.
 * @returns El tamaño visual o cero si no hay medidas.
 */
export function mermaidStageSize(svgSize: MermaidSvgSize | null, scale: number): MermaidCanvasSize {
  if (!svgSize) return { width: 0, height: 0 };
  return { width: svgSize.width * scale, height: svgSize.height * scale };
}

/**
 * Evita que el usuario desplace el lienzo fuera de la vista.
 * @param pan - Desplazamiento propuesto.
 * @param stage - Tamaño visual del escenario.
 * @param canvas - Espacio disponible.
 * @returns El desplazamiento limitado.
 */
export function clampMermaidPan(
  pan: MermaidPan,
  stage: MermaidCanvasSize,
  canvas: MermaidCanvasSize | null,
): MermaidPan {
  if (!canvas) return pan;
  const maxX = Math.max(0, (stage.width - canvas.width) / 2);
  const maxY = Math.max(0, (stage.height - canvas.height) / 2);
  const clamp = (value: number, limit: number) => limit === 0 ? 0 : Math.max(-limit, Math.min(limit, value));
  return {
    x: clamp(pan.x, maxX),
    y: clamp(pan.y, maxY),
  };
}

/**
 * Mantiene el punto del contenido bajo el ancla al cambiar el zoom.
 * @param pan - Desplazamiento actual.
 * @param from - Escala actual.
 * @param to - Escala nueva.
 * @param anchor - Punto del lienzo donde se hace zoom.
 * @param canvas - Espacio disponible.
 * @param svgSize - Tamaño natural del SVG.
 * @returns El desplazamiento nuevo, ya limitado.
 */
export function zoomMermaidPan(
  pan: MermaidPan,
  from: number,
  to: number,
  anchor: MermaidPoint,
  canvas: MermaidCanvasSize | null,
  svgSize: MermaidSvgSize | null,
): MermaidPan {
  if (!canvas || from <= 0 || to <= 0) return pan;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const contentX = (anchor.x - centerX - pan.x) / from;
  const contentY = (anchor.y - centerY - pan.y) / from;
  const next = {
    x: anchor.x - centerX - contentX * to,
    y: anchor.y - centerY - contentY * to,
  };
  return clampMermaidPan(next, mermaidStageSize(svgSize, to), canvas);
}
