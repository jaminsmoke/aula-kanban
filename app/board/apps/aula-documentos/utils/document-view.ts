/**
 * Formatea la hora del último guardado.
 * @param timestamp - Milisegundos desde epoch.
 * @returns Hora corta o cadena vacía.
 */
export function formatSavedTime(timestamp: number | null): string {
  if (timestamp === null) return "";
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}


