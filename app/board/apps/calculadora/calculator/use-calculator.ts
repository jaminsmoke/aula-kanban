"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { evaluateBasic } from "./basic-evaluate";
import { getEngineStatus, subscribeEngineStatus, type EngineStatus } from "./engine-status";
import { evaluateLatex, preloadEngine } from "./edu-evaluate";
import { HISTORY_KEY, type HistoryEntry, type Key } from "./calculator-keys";

/**
 * Estado y acciones de la calculadora: memoria, historial, teclado lógico y
 * atajos de teclado físico.
 * @returns Estado actual y acciones para la interfaz.
 */
export function useCalculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [exact, setExact] = useState<string | null>(null);
  const [resultValue, setResultValue] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keypad, setKeypadState] = useState<"basica" | "cientifica">("basica");
  const [sciPage, setSciPage] = useState(0);
  const [showEquations, setShowEquations] = useState(false);
  const [busy, setBusy] = useState(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>(getEngineStatus);
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

  // El estado del motor se comparte entre la calculadora y el editor de ecuaciones.
  useEffect(() => subscribeEngineStatus(setEngineStatus), []);

  // El motor solo se adelanta en las vistas que lo necesitan; la calculadora
  // básica sigue abriendo sin descargar compute-engine.
  const setKeypad = useCallback((mode: "basica" | "cientifica") => {
    setKeypadState(mode);
    if (mode === "cientifica") preloadEngine();
  }, []);

  const toggleEquations = useCallback(() => {
    setShowEquations((current) => {
      if (!current) preloadEngine();
      return !current;
    });
  }, []);

  const evaluate = useCallback(async (input: string) => {
    if (keypad === "basica") {
      const basic = evaluateBasic(input);
      if (basic) return basic;
    }
    return evaluateLatex(input);
  }, [keypad]);

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
    const evaluation = await evaluate(input);
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
  }, [expression, evaluate, remember]);

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
      const evaluation = await evaluate(expression);
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

  const selectHistory = (entry: HistoryEntry) => {
    setExpression(entry.raw);
    setResult(entry.result);
    setExact(null);
    setError(null);
    justEvaluated.current = false;
  };

  const clearHistory = () => {
    setHistory([]);
    try { window.localStorage.removeItem(HISTORY_KEY); } catch { /* sin persistencia */ }
  };

  return {
    expression,
    result,
    exact,
    error,
    keypad,
    sciPage,
    showEquations,
    busy,
    engineStatus,
    memory,
    history,
    showHistory,
    shown: error ?? (busy ? "Calculando…" : result ?? "0"),
    setKeypad,
    setSciPage,
    toggleEquations,
    toggleHistory: () => setShowHistory((current) => !current),
    clearMemory: () => setMemory(0),
    memorize,
    recall,
    backspace,
    press,
    selectHistory,
    clearHistory,
  };
}
