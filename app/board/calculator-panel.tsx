"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { evaluateLatex } from "./edu-evaluate";
import MultiEquation from "./multi-equation";

type Key = { label: string; token?: string; action?: string; aria: string; span?: number };
type HistoryEntry = { raw: string; result: string };

const BASIC_ROWS: Key[][] = [
  [{ label: "C", action: "clear", aria: "Limpiar" }, { label: "±", action: "sign", aria: "Cambiar signo" }, { label: "%", action: "percent", aria: "Porcentaje" }, { label: "÷", token: "/", aria: "Dividir" }],
  [{ label: "7", token: "7", aria: "7" }, { label: "8", token: "8", aria: "8" }, { label: "9", token: "9", aria: "9" }, { label: "×", token: "*", aria: "Multiplicar" }],
  [{ label: "4", token: "4", aria: "4" }, { label: "5", token: "5", aria: "5" }, { label: "6", token: "6", aria: "6" }, { label: "−", token: "-", aria: "Restar" }],
  [{ label: "1", token: "1", aria: "1" }, { label: "2", token: "2", aria: "2" }, { label: "3", token: "3", aria: "3" }, { label: "+", token: "+", aria: "Sumar" }],
  [{ label: "0", token: "0", aria: "0" }, { label: ".", token: ".", aria: "Punto decimal" }, { label: "=", action: "equals", aria: "Igual", span: 2 }],
];

const SCIENTIFIC_PAGES: Key[][][] = [
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

const HISTORY_KEY = "aula.calc.history";

/**
 * Convierte LaTeX en texto legible para la pantalla.
 * @param latex - Expresión en LaTeX.
 * @returns El texto con símbolos legibles (×, ÷, π, √…).
 */
function pretty(latex: string): string {
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
function formatNumber(value: number): string {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 10 });
}

/**
 * Calculadora con pantalla, memoria, historial y teclado ampliable a científico.
 * @returns La calculadora completa y, si se abre, el historial al lado.
 */
export default function CalculatorPanel() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [exact, setExact] = useState<string | null>(null);
  const [resultValue, setResultValue] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keypad, setKeypad] = useState<"basica" | "cientifica">("basica");
  const [sciPage, setSciPage] = useState(0);
  const [showEquations, setShowEquations] = useState(false);
  const [busy, setBusy] = useState(false);
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);
  const justEvaluated = useRef(false);
  const lastAnswer = useRef("");

  const remember = useCallback((entry: HistoryEntry) => {
    setHistory((current) => {
      const next = [entry, ...current.filter((item) => item.raw !== entry.raw)].slice(0, 20);
      try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* sin persistencia */
      }
      return next;
    });
  }, []);

  const append = useCallback((token: string) => {
    setError(null);
    setResult(null);
    setExact(null);
    setExpression((current) => {
      if (justEvaluated.current) {
        justEvaluated.current = false;
        // Tras un resultado: un número empieza un cálculo nuevo, un operador
        // continúa desde la respuesta anterior.
        if (/^[0-9.]/.test(token) || token.startsWith("\\") || token === "(") return token;
        return `${lastAnswer.current}${token}`;
      }
      return `${current}${token}`;
    });
  }, []);

  const equals = useCallback(async () => {
    const input = expression.trim();
    if (!input) return;
    setBusy(true);
    const evaluation = await evaluateLatex(input);
    setBusy(false);
    if (evaluation.kind === "value") {
      const display = evaluation.numeric ?? evaluation.exact;
      setResult(display);
      setExact(evaluation.numeric && evaluation.numeric !== evaluation.exact ? evaluation.exact : null);
      setResultValue(evaluation.numeric ? Number(evaluation.numeric.replace(/\./g, "").replace(",", ".")) : null);
      setError(null);
      lastAnswer.current = evaluation.latex;
      justEvaluated.current = true;
      remember({ raw: input, result: display });
    } else if (evaluation.kind === "error") {
      setError(evaluation.message);
      setResult(null);
      setExact(null);
    }
  }, [expression, remember]);

  const clear = useCallback(() => {
    setExpression("");
    setResult(null);
    setExact(null);
    setResultValue(null);
    setError(null);
    justEvaluated.current = false;
    lastAnswer.current = "";
  }, []);

  const backspace = useCallback(() => {
    setError(null);
    setResult(null);
    setExact(null);
    setExpression((current) => current.slice(0, -1));
  }, []);

  const sign = () => {
    setError(null);
    setResult(null);
    setExpression((current) => (current.startsWith("-") ? current.slice(1) : `-${current}`));
  };

  const memorize = async (direction: 1 | -1) => {
    let value = resultValue;
    if (value === null && expression.trim()) {
      const evaluation = await evaluateLatex(expression);
      if (evaluation.kind === "value" && evaluation.numeric) {
        value = Number(evaluation.numeric.replace(/\./g, "").replace(",", "."));
      }
    }
    if (value === null || !Number.isFinite(value)) return;
    setMemory((current) => current + direction * value);
  };

  const recall = () => {
    if (!memory) return;
    setError(null);
    setResult(null);
    setExact(null);
    justEvaluated.current = false;
    setExpression((current) => `${justEvaluated.current ? "" : current}${String(memory)}`);
  };

  const press = (key: Key) => {
    if (key.token) { append(key.token); return; }
    if (key.action === "clear") clear();
    if (key.action === "equals") void equals();
    if (key.action === "percent") append("/100");
    if (key.action === "sign") sign();
    if (key.action === "answer" && lastAnswer.current) append(lastAnswer.current);
  };

  // Teclado físico.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && typeof target.closest === "function" && target.closest("input, textarea, [contenteditable='true']")) return;
      if (/^[0-9.+\-*/^()!%]$/.test(event.key)) {
        event.preventDefault();
        append(event.key === "%" ? "/100" : event.key);
        return;
      }
      if (event.key === "Enter" || event.key === "=") { event.preventDefault(); void equals(); }
      if (event.key === "Escape") { event.preventDefault(); clear(); }
      if (event.key === "Backspace") { event.preventDefault(); backspace(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [append, equals, clear, backspace]);

  const shown = error ?? (busy ? "…" : result ?? "0");

  return (
    <div className="calc-layout">
      {showHistory ? (
        <aside className="edu-card calc-history" aria-label="Historial de operaciones">
          <div className="calc-history-head">
            <h3 className="edu-card-title">Historial</h3>
            {history.length > 0 ? (
              <button type="button" onClick={() => { setHistory([]); try { window.localStorage.removeItem(HISTORY_KEY); } catch { /* sin persistencia */ } }}>Borrar</button>
            ) : null}
          </div>
          {history.length === 0 ? (
            <p className="edu-hint">Todavía no hay operaciones.</p>
          ) : (
            <ul className="calc-history-list">
              {history.map((entry, index) => (
                <li key={`${entry.raw}-${index}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setExpression(entry.raw);
                      setResult(entry.result);
                      setExact(null);
                      setError(null);
                      justEvaluated.current = false;
                    }}
                  >
                    <span className="calc-history-expr">{pretty(entry.raw)}</span>
                    <span className="calc-history-result">= {entry.result}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      ) : null}

      <section className="edu-card edu-card--calc">
        <h3 className="edu-card-title">Calculadora</h3>

        <div className="calc">
          <div className="calc-screen" role="status" aria-live="polite">
            <div className="calc-screen-head">
              {memory !== 0 ? <span className="calc-memory" title="Memoria">M {formatNumber(memory)}</span> : null}
              <button type="button" className="calc-back" aria-label="Borrar último" onClick={backspace}>⌫</button>
            </div>
            <div className="calc-expression">{pretty(expression) || "\u00a0"}</div>
            <div className={`calc-value${error ? " is-error" : ""}`}>{shown}</div>
            {exact ? <div className="calc-exact">Exacto: {exact.replace(/sqrt\(/g, "√(")}</div> : null}
          </div>

          <div className="calc-modes" role="group" aria-label="Modo de la calculadora">
            <button type="button" aria-pressed={keypad === "basica"} onClick={() => setKeypad("basica")}>Básica</button>
            <button type="button" aria-pressed={keypad === "cientifica"} onClick={() => setKeypad("cientifica")}>Científica</button>
            <button type="button" className="calc-modes-equations" aria-pressed={showEquations} onClick={() => setShowEquations((current) => !current)}>Ecuaciones</button>
            <button type="button" className="calc-modes-history" aria-pressed={showHistory} onClick={() => setShowHistory((current) => !current)}>Historial ({history.length})</button>
          </div>

          <div className={`calc-extra${keypad === "cientifica" ? " is-open" : ""}`} aria-hidden={keypad !== "cientifica"} inert={keypad !== "cientifica"}>
            <div className="calc-pager" role="group" aria-label="Página de funciones">
              {[0, 1].map((page) => (
                <button key={page} type="button" aria-pressed={sciPage === page} onClick={() => setSciPage(page)}>{page + 1}</button>
              ))}
            </div>
            {SCIENTIFIC_PAGES[sciPage].map((row, index) => (
              <div className="calc-row calc-row--scientific" key={`sci-${sciPage}-${index}`}>
                {row.map((key) => (
                  <button key={key.aria} type="button" className="calc-key calc-key--function" aria-label={key.aria} onClick={() => press(key)}>
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
                    onClick={() => press(key)}
                  >
                    {key.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="calc-tools">
            <button type="button" onClick={() => setMemory(0)} aria-label="Borrar memoria" disabled={memory === 0}>MC</button>
            <button type="button" onClick={() => void memorize(1)} aria-label="Sumar a memoria">M+</button>
            <button type="button" onClick={() => void memorize(-1)} aria-label="Restar de memoria">M−</button>
            <button type="button" onClick={recall} aria-label="Recuperar memoria" disabled={memory === 0}>MR</button>
          </div>
        </div>
      </section>

      {showEquations ? (
        <aside className="edu-card calc-equations" aria-label="Ecuaciones">
          <h3 className="edu-card-title">Ecuaciones</h3>
          <MultiEquation />
        </aside>
      ) : null}
    </div>
  );
}
