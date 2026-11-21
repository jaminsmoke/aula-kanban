"use client";

import { useEffect, useState } from "react";
import { formatMermaidError, type MermaidErrorInfo } from "./mermaid-error";
import { getMermaidRenderer } from "./mermaid-renderer";

type PreviewState = {
  code: string;
  svg: string;
  error: MermaidErrorInfo | null;
};

/**
 * Estado de vista previa de un bloque Mermaid, con retardo al escribir.
 * @param code - Código actual del bloque.
 * @param enabled - Indica si el bloque debe renderizarse.
 * @returns SVG, error, estado de carga y última versión válida.
 */
export function useMermaidPreview(code: string, enabled = true) {
  const [state, setState] = useState<PreviewState>({ code: "", svg: "", error: null });
  const [lastValidCode, setLastValidCode] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getMermaidRenderer().render(code).then((next) => {
        if (cancelled || next === null) return;
        setState({ code, svg: next, error: null });
        if (next) setLastValidCode(code);
      }).catch((caught: unknown) => {
        if (cancelled) return;
        setState({
          code,
          svg: "",
          error: formatMermaidError(caught),
        });
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code, enabled]);

  return {
    svg: state.code === code ? state.svg : "",
    error: state.code === code ? state.error : null,
    loading: enabled && Boolean(code.trim()) && state.code !== code,
    lastValidCode,
  };
}
