"use client";

import { useRef, useState } from "react";
import { evaluateLines, type Evaluation } from "./edu-evaluate";

type Row = { id: number; value: string };

type PadKey = { label: string; token?: string; action?: "equals" | "back"; aria: string };

const PAD: PadKey[][] = [
  [{ label: "sin", token: "\\sin(", aria: "Seno" }, { label: "cos", token: "\\cos(", aria: "Coseno" }, { label: "tan", token: "\\tan(", aria: "Tangente" }, { label: "π", token: "\\pi", aria: "Pi" }, { label: "√", token: "\\sqrt(", aria: "Raíz cuadrada" }],
  [{ label: "ln", token: "\\ln(", aria: "Logaritmo neperiano" }, { label: "log", token: "\\log(", aria: "Logaritmo decimal" }, { label: "(", token: "(", aria: "Abrir paréntesis" }, { label: ")", token: ")", aria: "Cerrar paréntesis" }, { label: "^", token: "^", aria: "Potencia" }],
  [{ label: "7", token: "7", aria: "7" }, { label: "8", token: "8", aria: "8" }, { label: "9", token: "9", aria: "9" }, { label: "÷", token: "/", aria: "Dividir" }, { label: "×", token: "*", aria: "Multiplicar" }],
  [{ label: "4", token: "4", aria: "4" }, { label: "5", token: "5", aria: "5" }, { label: "6", token: "6", aria: "6" }, { label: "−", token: "-", aria: "Restar" }, { label: "+", token: "+", aria: "Sumar" }],
  [{ label: "1", token: "1", aria: "1" }, { label: "2", token: "2", aria: "2" }, { label: "3", token: "3", aria: "3" }, { label: ".", token: ".", aria: "Punto decimal" }, { label: "=", action: "equals", aria: "Calcular líneas" }],
  [{ label: "0", token: "0", aria: "0" }, { label: "!", token: "!", aria: "Factorial" }, { label: "⌫", action: "back", aria: "Borrar carácter" }],
];

const PLACEHOLDERS = ["x = 5", "y = 2", "x + y"];

let nextId = 4;

/**
 * Ecuaciones por líneas: una operación por fila, con variables compartidas,
 * resultado junto a cada fórmula y teclado matemático que escribe en la fila
 * activa.
 * @returns La lista de líneas, su teclado y las acciones.
 */
export default function MultiEquation() {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, value: "" },
    { id: 2, value: "" },
    { id: 3, value: "" },
  ]);
  const [results, setResults] = useState<Evaluation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeRow, setActiveRow] = useState<number | null>(1);
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  const update = (id: number, value: string) => {
    setResults(null);
    setRows((current) => current.map((row) => (row.id === id ? { ...row, value } : row)));
  };

  const addAfter = (id?: number) => {
    const row = { id: nextId++, value: "" };
    setResults(null);
    setRows((current) => {
      const index = id === undefined ? current.length - 1 : current.findIndex((item) => item.id === id);
      return [...current.slice(0, index + 1), row, ...current.slice(index + 1)];
    });
    setActiveRow(row.id);
    window.requestAnimationFrame(() => inputs.current[row.id]?.focus());
  };

  const remove = (id: number) => {
    setResults(null);
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const calculate = async () => {
    setBusy(true);
    setResults(await evaluateLines(rows.map((row) => row.value)));
    setBusy(false);
  };

  const clearAll = () => {
    setResults(null);
    setRows([{ id: nextId++, value: "" }]);
    setActiveRow(nextId - 1);
  };

  /**
   * Inserta un token en la fila activa, en la posición del cursor.
   * @param token - Texto matemático que se inserta.
   */
  const insert = (token: string) => {
    const id = activeRow ?? rows[0]?.id;
    if (!id) return;
    const input = inputs.current[id];
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const start = input?.selectionStart ?? row.value.length;
    const end = input?.selectionEnd ?? row.value.length;
    update(id, `${row.value.slice(0, start)}${token}${row.value.slice(end)}`);
    window.requestAnimationFrame(() => {
      const element = inputs.current[id];
      element?.focus();
      const caret = start + token.length;
      element?.setSelectionRange(caret, caret);
    });
  };

  /** Borra el carácter anterior al cursor de la fila activa. */
  const backspace = () => {
    const id = activeRow ?? rows[0]?.id;
    if (!id) return;
    const input = inputs.current[id];
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const start = input?.selectionStart ?? row.value.length;
    const end = input?.selectionEnd ?? row.value.length;
    if (start === end && start === 0) return;
    const from = start === end ? start - 1 : start;
    update(id, `${row.value.slice(0, from)}${row.value.slice(end)}`);
    window.requestAnimationFrame(() => {
      const element = inputs.current[id];
      element?.focus();
      element?.setSelectionRange(from, from);
    });
  };

  const press = (key: PadKey) => {
    if (key.token) { insert(key.token); return; }
    if (key.action === "equals") void calculate();
    if (key.action === "back") backspace();
  };

  return (
    <div
      className="multi-eq"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          void calculate();
        }
      }}
    >
      <div className="multi-eq-actions">
        <button type="button" className="edu-eq-primary" onClick={() => void calculate()} disabled={busy}>
          {busy ? "Calculando…" : "Calcular"}
        </button>
        <button type="button" onClick={() => addAfter()}>+ Añadir línea</button>
        <button type="button" onClick={clearAll}>Limpiar</button>
        <span className="multi-eq-hint">Una operación por línea. Puedes asignar variables (x = 5) y usarlas en las siguientes.</span>
      </div>

      <div className="multi-eq-rows" role="group" aria-label="Líneas de cálculo">
        {rows.map((row, index) => {
          const result = results?.[index];
          return (
            <div className="multi-eq-row" key={row.id}>
              <span className="multi-eq-index" aria-hidden>{index + 1}</span>
              <input
                ref={(element) => { inputs.current[row.id] = element; }}
                className="multi-eq-input"
                value={row.value}
                placeholder={PLACEHOLDERS[index] ?? "Otra operación"}
                aria-label={`Línea ${index + 1}`}
                autoComplete="off"
                spellCheck={false}
                onFocus={() => setActiveRow(row.id)}
                onChange={(event) => update(row.id, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addAfter(row.id);
                  }
                }}
              />
              <span className={`multi-eq-result${result?.kind === "error" ? " is-error" : ""}`} aria-live="polite">
                {result ? (result.kind === "empty" ? "" : result.kind === "error" ? result.message : `= ${result.numeric ?? result.exact}`) : ""}
              </span>
              <button type="button" className="multi-eq-remove" onClick={() => remove(row.id)} aria-label={`Quitar línea ${index + 1}`}>×</button>
            </div>
          );
        })}
      </div>

      <div className="multi-eq-pad" role="group" aria-label="Teclado de ecuaciones">
        {PAD.map((padRow, index) => (
          <div className="multi-eq-pad-row" key={`pad-${index}`}>
            {padRow.map((key) => (
              <button
                key={key.aria}
                type="button"
                className={`multi-eq-key${key.action === "equals" ? " is-equals" : ""}`}
                aria-label={key.aria}
                onClick={() => press(key)}
              >
                {key.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
