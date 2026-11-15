/**
 * Cálculo de dimensiones de una miniatura derivada (PER-02, fase 2).
 *
 * Es aritmética pura: no toca el DOM ni decide formatos. La miniatura nunca
 * amplía la imagen y conserva la proporción redondeando al píxel más cercano.
 */

/** Ancho máximo por defecto de la miniatura. */
export const MINIATURA_MAX_WIDTH = 800;

/** Dimensiones calculadas de la miniatura. */
export type MiniaturaSize = {
  width: number;
  height: number;
  /** Factor aplicado; 1 cuando la imagen ya cabe y no se reduce. */
  scale: number;
};

/**
 * Calcula el tamaño de la miniatura sin ampliar la imagen original.
 * @param input - Dimensiones naturales y ancho máximo deseado.
 * @returns El tamaño derivado, o `null` si las dimensiones no son válidas.
 */
export function calcularDimensionesMiniatura(input: { width: number; height: number; maxWidth?: number }): MiniaturaSize | null {
  const maxWidth = input.maxWidth ?? MINIATURA_MAX_WIDTH;
  if (
    !Number.isFinite(input.width) || !Number.isFinite(input.height)
    || !Number.isFinite(maxWidth)
    || input.width <= 0 || input.height <= 0 || maxWidth <= 0
  ) {
    return null;
  }
  const scale = Math.min(1, maxWidth / input.width);
  return {
    width: Math.max(1, Math.round(input.width * scale)),
    height: Math.max(1, Math.round(input.height * scale)),
    scale,
  };
}
