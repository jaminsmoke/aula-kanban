/**
 * Nombre de un punto según su orden: A, B, …, Z, P27…
 * @param index - Posición del punto, empezando en cero.
 * @returns Letra o identificador del punto.
 */
export function pointName(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  return `P${index + 1}`;
}

/**
 * Distancia euclídea entre dos puntos.
 * @param x1 - Coordenada X del primer punto.
 * @param y1 - Coordenada Y del primer punto.
 * @param x2 - Coordenada X del segundo punto.
 * @param y2 - Coordenada Y del segundo punto.
 * @returns Distancia entre ambos puntos.
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Distancia con dos decimales, para las etiquetas del lienzo.
 * @param value - Distancia que se quiere formatear.
 * @returns Texto con dos decimales y coma decimal.
 */
export function formatDistance(value: number): string {
  return value.toFixed(2).replace(".", ",");
}
