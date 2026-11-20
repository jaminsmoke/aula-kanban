"use client";

import type { SheetCalculationSummary } from "./hoja-calculo-calc";
import type { FormulaLimit } from "./hoja-calculo-formula";

const LIMIT_LABELS: Record<FormulaLimit, string> = {
  formulaLength: "fórmula demasiado larga",
  rangeCells: "rango demasiado grande",
  depth: "cadena de dependencias demasiado profunda",
};

type HojaCalculoSidePanelProps = {
  calculation: SheetCalculationSummary;
  statusText: string;
};

/**
 * Resumen de cálculo, estado y ayuda de la hoja.
 * @param props - Resultado del cálculo y mensaje de estado.
 * @returns El panel lateral.
 */
export function HojaCalculoSidePanel({ calculation, statusText }: HojaCalculoSidePanelProps) {
  const errorCount = calculation.errors.length;
  const limitLabels = [...new Set(calculation.errors.flatMap((entry) => (
    entry.limit ? [LIMIT_LABELS[entry.limit]] : []
  )))];

  return (
    <aside className="hoja-calculo-side">
      <section className="hoja-calculo-info">
        <h3>Presupuesto de ejemplo</h3>
        <p>Edita las celdas y cambia cantidades y precios. Las fórmulas se calculan automáticamente y se conservan como texto en el proyecto.</p>
        <p className="hoja-calculo-status" role="status">{statusText}</p>
        <div className="hoja-calculo-calculation" aria-live="polite">
          <p className="hoja-calculo-calculation-head">
            <strong>{errorCount ? `${errorCount} ${errorCount === 1 ? "celda con error" : "celdas con error"}` : "Cálculo correcto"}</strong>
            <span>{calculation.formulas} {calculation.formulas === 1 ? "fórmula" : "fórmulas"}</span>
          </p>
          {errorCount ? (
            <ul className="hoja-calculo-errors">
              {calculation.errors.slice(0, 3).map((entry) => (
                <li key={entry.label}><code>{entry.label}</code> {entry.error}</li>
              ))}
              {errorCount > 3 ? <li>+{errorCount - 3} más</li> : null}
            </ul>
          ) : null}
          {limitLabels.length ? (
            <p className="hoja-calculo-limit">Límite alcanzado: {limitLabels.join(", ")}.</p>
          ) : null}
        </div>
      </section>
      <section className="hoja-calculo-help">
        <h3>Atajos</h3>
        <ul>
          <li>Haz clic o arrastra para seleccionar celdas.</li>
          <li>Selecciona una celda y edita su contenido en la barra <code>fx</code>.</li>
          <li>Empieza una fórmula con <code>=</code>. Admite <code>SUM</code>, <code>AVERAGE</code>, <code>MIN</code>, <code>MAX</code>, <code>COUNT</code>, <code>IF</code>, <code>ROUND</code> y <code>ABS</code>.</li>
          <li>Los errores <code>#VALOR!</code>, <code>#REF!</code>, <code>#DIV/0!</code>, <code>#NOMBRE!</code> y <code>#CIRC!</code> se muestran en su celda.</li>
          <li>Límites: 2.000 caracteres por fórmula, 10.000 celdas por rango y 200 niveles de dependencia.</li>
          <li>Las filas y columnas se añaden al final.</li>
        </ul>
      </section>
    </aside>
  );
}
