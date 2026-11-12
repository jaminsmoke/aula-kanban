"use client";

import { createContext, useContext, useId, useRef, type ReactNode } from "react";
import { m, useInView, useReducedMotion } from "motion/react";
import { ambientLoop, artEnter, stagger } from "../motion";

/** Estado de animación que comparte una ilustración con sus piezas. */
type ArtState = {
  /** La ilustración ya entró en pantalla (se queda en true). */
  entered: boolean;
  /** Está en pantalla ahora y se permite movimiento: los bucles corren. */
  live: boolean;
  /** Movimiento reducido: todo se pinta en su estado final, sin animar. */
  reduced: boolean;
};

const ArtContext = createContext<ArtState>({ entered: true, live: false, reduced: true });

/**
 * Estado de animación de la ilustración que contiene al componente.
 * @returns Si ha entrado, si está viva y si hay movimiento reducido.
 */
export function useArt(): ArtState {
  return useContext(ArtContext);
}

/**
 * Lienzo SVG común de todas las ilustraciones: viewBox fijo (sin saltos de
 * maquetación), título accesible y detección de visibilidad para que las
 * animaciones solo corran cuando se ven.
 * @param props - Descripción accesible, viewBox y piezas del dibujo.
 * @returns El SVG con su contexto de animación.
 */
export function ArtFrame({ label, viewBox = "0 0 260 200", className, children }: { label: string; viewBox?: string; className?: string; children: ReactNode }) {
  const ref = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const reduced = useReducedMotion() ?? false;
  const entered = useInView(ref, { once: true, amount: 0.35 });
  const visible = useInView(ref, { amount: 0.1 });
  const state: ArtState = { entered: reduced || entered, live: !reduced && entered && visible, reduced };
  return (
    <ArtContext.Provider value={state}>
      <svg ref={ref} className={className ? `doc-art-svg ${className}` : "doc-art-svg"} viewBox={viewBox} role="img" aria-labelledby={titleId} focusable="false">
        <title id={titleId}>{label}</title>
        {children}
      </svg>
    </ArtContext.Provider>
  );
}

/**
 * Pieza que aparece al entrar la ilustración (fundido + escala desde su centro).
 * @param props - Orden en la coreografía y piezas SVG.
 * @returns Un grupo animado.
 */
export function Appear({ order = 0, from = 0.85, children }: { order?: number; from?: number; children: ReactNode }) {
  const { entered, reduced } = useArt();
  return (
    <m.g
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
      initial={reduced ? false : { opacity: 0, scale: from }}
      animate={entered ? { opacity: 1, scale: 1 } : undefined}
      transition={{ ...artEnter, delay: order * stagger.art }}
    >
      {children}
    </m.g>
  );
}

/**
 * Grupo que flota suavemente mientras la ilustración está en pantalla.
 * @param props - Amplitud (px), desfase y piezas SVG.
 * @returns Un grupo animado o quieto.
 */
export function Float({ amplitude = 4, delay = 0, children }: { amplitude?: number; delay?: number; children: ReactNode }) {
  const { live } = useArt();
  return (
    <m.g animate={{ y: live ? -amplitude : 0 }} transition={live ? ambientLoop(delay) : artEnter}>
      {children}
    </m.g>
  );
}

/**
 * Trazo que se dibuja al entrar la ilustración.
 * @param props - Path, clase de color, grosor, orden en la coreografía y duración (s).
 * @returns Un path animado.
 */
export function Draw({ d, className, strokeWidth = 3, order = 0, seconds = 0.6 }: { d: string; className?: string; strokeWidth?: number; order?: number; seconds?: number }) {
  const { entered, reduced } = useArt();
  const delay = order * stagger.art;
  return (
    <m.path
      d={d}
      className={className}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={reduced ? false : { pathLength: 0, opacity: 0 }}
      animate={entered ? { pathLength: 1, opacity: 1 } : undefined}
      transition={{ pathLength: { duration: seconds, ease: "easeInOut", delay }, opacity: { duration: 0.01, delay } }}
    />
  );
}
