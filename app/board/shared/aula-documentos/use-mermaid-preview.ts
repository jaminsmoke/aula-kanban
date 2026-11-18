"use client";

import { useEffect, useState } from "react";
import { getMermaidRenderer } from "./mermaid-renderer";

type PreviewState = {
  code: string;
  svg: string;
  error: string | null;
};

/**
 * Estado de vista previa de un bloque Mermaid, con retardo al escribir.
 * @param code - Código actual del bloque.
 * @returns SVG, error y estado de carga.
 */
export function useMermaidPreview(code: string) {
  const [state, setState] = useState<PreviewState>({ code: "", svg: "", error: null });

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getMermaidRenderer().render(code).then((next) => {
        if (cancelled || next === null) return;
        setState({ code, svg: next, error: null });
      }).catch((caught: unknown) => {
        if (cancelled) return;
        setState({
          code,
          svg: "",
          error: caught instanceof Error ? caught.message.split("\n")[0] : "No se pudo dibujar el diagrama.",
        });
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code]);

  return {
    svg: state.code === code ? state.svg : "",
    error: state.code === code ? state.error : null,
    loading: Boolean(code.trim()) && state.code !== code,
  };
}
