/**
 * Normaliza texto para búsquedas sin distinguir mayúsculas, espacios
 * exteriores ni diacríticos.
 * @param value - Texto original.
 * @returns Texto en minúsculas y sin tildes.
 */
export function normalizeSearch(value: string): string {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

/**
 * Comprueba si una consulta aparece en uno o varios campos.
 * Los campos se unen con espacios para conservar búsquedas entre título y
 * responsable, como en el tablero.
 * @param query - Consulta escrita por la persona.
 * @param parts - Campos buscables.
 * @returns `true` si hay coincidencia o la consulta está vacía.
 */
export function matchesSearch(query: string, ...parts: string[]): boolean {
  const needle = normalizeSearch(query);
  return !needle || normalizeSearch(parts.join(" ")).includes(needle);
}
