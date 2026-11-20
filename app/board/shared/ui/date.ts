/**
 * Formatea una fecha y hora en español.
 * @param timestamp - Milisegundos desde epoch o `null`.
 * @returns Fecha legible o `null`.
 */
export function formatDateTime(timestamp: number | null): string | null {
  if (timestamp === null || !Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
