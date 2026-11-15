/**
 * Serializa una persona en el formato `kind:profileId` del selector.
 * @param kind - `student` o `teacher`.
 * @param profileId - Identificador de la ficha.
 * @returns El valor del `<option>`.
 */
export function personValue(kind: string, profileId: string): string {
  return `${kind}:${profileId}`;
}

/**
 * Fecha local desplazada respecto a hoy.
 * @param offsetDays - Días de desplazamiento.
 * @returns La fecha en formato `YYYY-MM-DD`.
 */
export function dateValue(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
