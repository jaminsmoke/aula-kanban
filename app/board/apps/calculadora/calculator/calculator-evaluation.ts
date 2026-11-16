export type Evaluation =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "value"; exact: string; latex: string; numeric: string | null; isNumeric: boolean };

/**
 * Formatea un número con coma decimal y sin colas infinitas.
 * @param value - Número en texto, tal como lo devuelve el motor.
 * @returns El número formateado para mostrarlo.
 */
export function formatNumber(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return numeric.toLocaleString("es-ES", { maximumFractionDigits: 10 });
}
