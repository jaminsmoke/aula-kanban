"use client";

import { BASIC_ROWS, SCIENTIFIC_PAGES, type Key } from "./calculator-keys";

/**
 * Teclados básico y científico de la calculadora.
 * @param props - Modo, página científica y acción al pulsar.
 * @returns Las filas de teclas.
 */
export default function CalculatorKeypad({ keypad, sciPage, onPage, onPress }: {
  keypad: "basica" | "cientifica";
  sciPage: number;
  onPage: (page: number) => void;
  onPress: (key: Key) => void;
}) {
  return (
    <>
      <div className={`calc-extra${keypad === "cientifica" ? " is-open" : ""}`} aria-hidden={keypad !== "cientifica"} inert={keypad !== "cientifica"}>
        <div className="calc-pager" role="group" aria-label="Página de funciones">
          {[0, 1].map((page) => (
            <button key={page} type="button" aria-pressed={sciPage === page} onClick={() => onPage(page)}>{page + 1}</button>
          ))}
        </div>
        {SCIENTIFIC_PAGES[sciPage].map((row, index) => (
          <div className="calc-row calc-row--scientific" key={`sci-${sciPage}-${index}`}>
            {row.map((key) => (
              <button key={key.aria} type="button" className="calc-key calc-key--function" aria-label={key.aria} onClick={() => onPress(key)}>
                {key.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="calc-pad">
        {BASIC_ROWS.map((row, index) => (
          <div className="calc-row" key={`row-${index}`}>
            {row.map((key) => (
              <button
                key={key.aria}
                type="button"
                className={`calc-key${key.action === "equals" ? " calc-key--equals" : ""}${["clear", "sign", "percent"].includes(key.action ?? "") ? " calc-key--utility" : ""}${key.token && ["/", "*", "-", "+"].includes(key.token) ? " calc-key--operator" : ""}`}
                aria-label={key.aria}
                style={key.span ? { gridColumn: `span ${key.span}` } : undefined}
                onClick={() => onPress(key)}
              >
                {key.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
