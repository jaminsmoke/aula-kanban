"use client";

import { lazy, Suspense } from "react";
import CalculatorHistory from "./calculator-history";
import CalculatorKeypad from "./calculator-keypad";
import { formatNumber, pretty } from "./calculator-keys";
import { useCalculator } from "./use-calculator";

const MultiEquation = lazy(() => import("./multi-equation"));

/**
 * Calculadora con pantalla, memoria, historial y teclado ampliable a científico.
 * @returns La calculadora completa y, si se abre, el historial al lado.
 */
export default function CalculatorPanel() {
  const calc = useCalculator();

  return (
    <div className="calc-layout">
      {calc.showHistory ? (
        <CalculatorHistory history={calc.history} onClear={calc.clearHistory} onSelect={calc.selectHistory} />
      ) : null}

      <section className="edu-card edu-card--calc">
        <h3 className="edu-card-title">Calculadora</h3>

        <div className="calc">
          <div className="calc-screen" role="status" aria-live="polite" aria-busy={calc.busy}>
            <div className="calc-screen-head">
              {calc.memory !== 0 ? <span className="calc-memory" title="Memoria">M {formatNumber(calc.memory)}</span> : null}
              <button type="button" className="calc-back" aria-label="Borrar último" onClick={calc.backspace}>⌫</button>
            </div>
            <div className="calc-expression">{pretty(calc.expression) || "\u00a0"}</div>
            <div className={`calc-value${calc.error ? " is-error" : ""}${calc.busy ? " is-loading" : ""}`}>{calc.shown}</div>
            {calc.exact ? <div className="calc-exact">Exacto: {calc.exact.replace(/sqrt\(/g, "√(")}</div> : null}
          </div>

          <div className="calc-modes" role="group" aria-label="Modo de la calculadora">
            <button type="button" aria-pressed={calc.keypad === "basica"} onClick={() => calc.setKeypad("basica")}>Básica</button>
            <button type="button" aria-pressed={calc.keypad === "cientifica"} onClick={() => calc.setKeypad("cientifica")}>Científica</button>
            <button type="button" className="calc-modes-equations" aria-pressed={calc.showEquations} onClick={calc.toggleEquations}>Ecuaciones</button>
            <button type="button" className="calc-modes-history" aria-pressed={calc.showHistory} onClick={calc.toggleHistory}>Historial ({calc.history.length})</button>
          </div>

          <CalculatorKeypad keypad={calc.keypad} sciPage={calc.sciPage} onPage={calc.setSciPage} onPress={calc.press} />

          <div className="calc-tools">
            <button type="button" onClick={calc.clearMemory} aria-label="Borrar memoria" disabled={calc.memory === 0}>MC</button>
            <button type="button" onClick={() => void calc.memorize(1)} aria-label="Sumar a memoria">M+</button>
            <button type="button" onClick={() => void calc.memorize(-1)} aria-label="Restar de memoria">M−</button>
            <button type="button" onClick={calc.recall} aria-label="Recuperar memoria" disabled={calc.memory === 0}>MR</button>
          </div>
        </div>
      </section>

      {calc.showEquations ? (
        <aside className="edu-card calc-equations" aria-label="Ecuaciones">
          <h3 className="edu-card-title">Ecuaciones</h3>
          <Suspense fallback={<p className="edu-hint" role="status">Cargando las ecuaciones…</p>}>
            <MultiEquation />
          </Suspense>
        </aside>
      ) : null}
    </div>
  );
}
