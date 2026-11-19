"use client";

import { useEffect, useState } from "react";
import { formatMermaidError, type MermaidErrorInfo } from "../../shared/aula-documentos/mermaid-error";
import { createMermaidRenderer } from "./mermaid-render";

/**
 * Estado de edición y vista previa de Mermaid, con retardo al escribir.
 * @param initialCode - Código inicial del editor.
 * @returns Código, SVG, error y acciones de edición.
 */
export function useMermaidPreview(initialCode: string) {
  const [code, setCode] = useState(initialCode);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<MermaidErrorInfo | null>(null);
  const [renderer] = useState(createMermaidRenderer);

  // Vista previa con retardo mientras se escribe.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void renderer.render(code).then((next) => {
        if (cancelled || next === null) return;
        setSvg(next);
        setError(null);
      }).catch((caught: unknown) => {
        if (cancelled) return;
        setError(formatMermaidError(caught));
      });
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [code, renderer]);

  const clear = () => {
    setCode("");
    setSvg("");
    setError(null);
  };

  return { code, setCode, svg, error, clear };
}
