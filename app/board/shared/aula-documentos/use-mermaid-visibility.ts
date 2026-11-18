"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Indica si un bloque está cerca del viewport para renderizarlo bajo demanda.
 * @param ref - Referencia al elemento del bloque.
 * @returns `true` cuando debe renderizarse.
 */
export function useMermaidVisibility(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, visible]);

  return visible;
}
