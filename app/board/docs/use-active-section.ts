"use client";

import { useEffect, useState } from "react";

/** Línea de lectura: una sección está activa cuando su inicio la cruza. */
const READING_LINE = 0.3;

/**
 * Sección activa del índice según el scroll: la última cuyo inicio ha pasado
 * la línea de lectura (30 % del alto de la ventana). Al llegar al final de la
 * página se activa la última, aunque sea corta.
 * @param anchors - Ids de los elementos de sección, en orden.
 * @returns El id del ancla activa, o el primero si aún no se ha desplazado.
 */
export function useActiveSection(anchors: readonly string[]): string {
  const [active, setActive] = useState(anchors[0] ?? "");

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * READING_LINE;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = anchors[0] ?? "";
      for (const id of anchors) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = id;
      }
      setActive(atBottom ? anchors[anchors.length - 1] ?? current : current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [anchors]);

  return active;
}
