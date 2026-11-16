"use client";

import CalculatorPanel from "./calculator/calculator-panel";
import "../edu-base.css";
import "./calculadora.css";

/**
 * Calculadora: pantalla, memoria, historial, modo científico y ecuaciones por
 * líneas con variables compartidas.
 * @returns La ventana de la calculadora.
 */
export default function CalculadoraApp() {
  return (
    <div className="edu-app">
      <div className="edu-app-body">
        <div className="edu-view edu-view--fill">
          <CalculatorPanel />
        </div>
      </div>
    </div>
  );
}
