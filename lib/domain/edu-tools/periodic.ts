import elementsData from "./periodic-elements.json";
import type { PeriodicElement } from "./periodic-types";

export type { PeriodicElement } from "./periodic-types";

/** Catálogo completo de la tabla periódica, compartido por la interfaz y MCP. */
export const PERIODIC_ELEMENTS = elementsData as PeriodicElement[];

/**
 * Busca un elemento por número atómico o por símbolo.
 * El símbolo se compara sin distinguir mayúsculas ni espacios exteriores.
 * @param input - Número atómico o símbolo; el número tiene prioridad.
 * @returns El elemento o `null` si no existe.
 */
export function findPeriodicElement(input: { simbolo?: string; numero?: number }): PeriodicElement | null {
  if (input.numero !== undefined) {
    return PERIODIC_ELEMENTS.find((element) => element.number === input.numero) ?? null;
  }
  const simbolo = input.simbolo?.trim().toLowerCase();
  if (!simbolo) return null;
  return PERIODIC_ELEMENTS.find((element) => element.symbol.toLowerCase() === simbolo) ?? null;
}
