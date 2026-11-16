/** Tecla de la calculadora. */
export type Key = { label: string; token?: string; action?: string; aria: string; span?: number };

/** Operación guardada en el historial. */
export type HistoryEntry = { raw: string; result: string };

export const BASIC_ROWS: Key[][] = [
  [{ label: "C", action: "clear", aria: "Limpiar" }, { label: "±", action: "sign", aria: "Cambiar signo" }, { label: "%", action: "percent", aria: "Porcentaje" }, { label: "÷", token: "/", aria: "Dividir" }],
  [{ label: "7", token: "7", aria: "7" }, { label: "8", token: "8", aria: "8" }, { label: "9", token: "9", aria: "9" }, { label: "×", token: "*", aria: "Multiplicar" }],
  [{ label: "4", token: "4", aria: "4" }, { label: "5", token: "5", aria: "5" }, { label: "6", token: "6", aria: "6" }, { label: "−", token: "-", aria: "Restar" }],
  [{ label: "1", token: "1", aria: "1" }, { label: "2", token: "2", aria: "2" }, { label: "3", token: "3", aria: "3" }, { label: "+", token: "+", aria: "Sumar" }],
  [{ label: "0", token: "0", aria: "0" }, { label: ".", token: ".", aria: "Punto decimal" }, { label: "=", action: "equals", aria: "Igual", span: 2 }],
];

export const SCIENTIFIC_PAGES: Key[][][] = [
  [
    [{ label: "sin", token: "\\sin(", aria: "Seno" }, { label: "cos", token: "\\cos(", aria: "Coseno" }, { label: "tan", token: "\\tan(", aria: "Tangente" }, { label: "π", token: "\\pi", aria: "Pi" }, { label: "e", token: "e", aria: "Número e" }],
    [{ label: "ln", token: "\\ln(", aria: "Logaritmo neperiano" }, { label: "log", token: "\\log(", aria: "Logaritmo decimal" }, { label: "√", token: "\\sqrt(", aria: "Raíz cuadrada" }, { label: "x²", token: "^2", aria: "Elevar al cuadrado" }, { label: "xʸ", token: "^", aria: "Potencia" }],
    [{ label: "(", token: "(", aria: "Abrir paréntesis" }, { label: ")", token: ")", aria: "Cerrar paréntesis" }, { label: "!", token: "!", aria: "Factorial" }, { label: "Ans", action: "answer", aria: "Respuesta anterior" }],
  ],
  [
    [{ label: "asin", token: "\\arcsin(", aria: "Arcoseno" }, { label: "acos", token: "\\arccos(", aria: "Arcocoseno" }, { label: "atan", token: "\\arctan(", aria: "Arcotangente" }, { label: "sinh", token: "\\sinh(", aria: "Seno hiperbólico" }, { label: "cosh", token: "\\cosh(", aria: "Coseno hiperbólico" }],
    [{ label: "tanh", token: "\\tanh(", aria: "Tangente hiperbólica" }, { label: "|x|", token: "\\operatorname{abs}(", aria: "Valor absoluto" }, { label: "mod", token: "\\bmod", aria: "Módulo" }, { label: "10ˣ", token: "10^", aria: "Diez elevado" }, { label: "eˣ", token: "e^", aria: "e elevado" }],
    [{ label: "x³", token: "^3", aria: "Elevar al cubo" }, { label: "1/x", token: "^(-1)", aria: "Inverso" }, { label: "%", token: "/100", aria: "Porcentaje" }, { label: "Ans", action: "answer", aria: "Respuesta anterior" }],
  ],
];

export const HISTORY_KEY = "aula.calc.history";

/**
 * Convierte LaTeX en texto legible para la pantalla.
 * @param latex - Expresión en LaTeX.
 * @returns El texto con símbolos legibles (×, ÷, π, √…).
 */
export function pretty(latex: string): string {
  return latex
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/\\sqrt\(/g, "√(")
    .replace(/\\pi/g, "π")
    .replace(/\\sin/g, "sin")
    .replace(/\\cos/g, "cos")
    .replace(/\\tan/g, "tan")
    .replace(/\\ln/g, "ln")
    .replace(/\\log/g, "log")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\left|\\right/g, "")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/[{}]/g, "");
}

/**
 * Convierte un número al formato español sin separadores de miles.
 * @param value - Número que se quiere mostrar.
 * @returns El número formateado con coma decimal.
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 10 });
}
