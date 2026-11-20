import { createLocalState } from "../../../../../lib/client-storage";
import { HISTORY_KEY, type HistoryEntry } from "./calculator-keys";

/** Clave local del último modo de teclado. */
export const CALCULATOR_MODE_KEY = "aula-kanban-calculator-mode";

/** Modo de teclado de la calculadora. */
export type CalculatorMode = "basica" | "cientifica";

/**
 * Valida el modo guardado.
 * @param value - Valor candidato.
 * @returns El modo válido o `null`.
 */
function parseMode(value: unknown): CalculatorMode | null {
  return value === "basica" || value === "cientifica" ? value : null;
}

/**
 * Valida el historial guardado.
 * @param value - Valor candidato.
 * @returns La lista válida o `null`.
 */
function parseHistory(value: unknown): HistoryEntry[] | null {
  if (!Array.isArray(value)) return null;
  return value.every((entry) => (
    typeof entry === "object"
    && entry !== null
    && typeof (entry as { raw?: unknown }).raw === "string"
    && typeof (entry as { result?: unknown }).result === "string"
  )) ? value as HistoryEntry[] : null;
}

/** Estado local del modo de teclado. */
export const calculatorModeState = createLocalState<CalculatorMode>({
  key: CALCULATOR_MODE_KEY,
  version: 1,
  validate: parseMode,
  fallback: () => "basica",
});

/** Estado local del historial de operaciones. */
export const calculatorHistoryState = createLocalState<HistoryEntry[]>({
  key: HISTORY_KEY,
  version: 1,
  validate: parseHistory,
  fallback: () => [],
});
