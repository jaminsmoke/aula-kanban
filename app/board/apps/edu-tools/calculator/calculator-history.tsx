"use client";

import { pretty, type HistoryEntry } from "./calculator-keys";

/**
 * Panel de historial de operaciones.
 * @param props - Entradas, borrado y selección.
 * @returns La tarjeta de historial.
 */
export default function CalculatorHistory({ history, onClear, onSelect }: {
  history: HistoryEntry[];
  onClear: () => void;
  onSelect: (entry: HistoryEntry) => void;
}) {
  return (
    <aside className="edu-card calc-history" aria-label="Historial de operaciones">
      <div className="calc-history-head">
        <h3 className="edu-card-title">Historial</h3>
        {history.length > 0 ? <button type="button" onClick={onClear}>Borrar</button> : null}
      </div>
      {history.length === 0 ? (
        <p className="edu-hint">Todavía no hay operaciones.</p>
      ) : (
        <ul className="calc-history-list">
          {history.map((entry, index) => (
            <li key={`${entry.raw}-${index}`}>
              <button type="button" onClick={() => onSelect(entry)}>
                <span className="calc-history-expr">{pretty(entry.raw)}</span>
                <span className="calc-history-result">= {entry.result}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
