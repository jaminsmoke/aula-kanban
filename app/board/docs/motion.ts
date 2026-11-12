import type { Transition, Variants } from "motion/react";

/**
 * Tokens de movimiento de la documentación. Reflejan los de `globals.css`
 * (`--ease-out`, `--duration-*`) para que CSS y Motion se muevan igual.
 */
export const ease = {
  /** `--ease-out`: entrada rápida que frena suave. */
  out: [0.22, 1, 0.36, 1],
  /** Vaivén simétrico para los bucles ambientales. */
  inOut: [0.45, 0, 0.55, 1],
} as const;

/** Duraciones en segundos. */
export const duration = {
  fast: 0.16,
  base: 0.24,
  slow: 0.34,
  reveal: 0.5,
  draw: 0.9,
  ambient: 5,
} as const;

/** Escalonado entre elementos hermanos (s). */
export const stagger = { children: 0.06, art: 0.12 } as const;

/** Distancia del desplazamiento de entrada (px). Pequeña: guía, no distrae. */
const REVEAL_OFFSET = 14;

/** Margen del viewport para disparar el reveal un poco antes de llegar. */
export const revealViewport = { once: true, amount: 0.15 } as const;

/** Contenedor que escalona la entrada de sus hijos. */
export const revealContainer: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: stagger.children, delayChildren: 0.04 } },
};

/** Entrada de un elemento: aparece y sube unos píxeles (solo opacity/transform). */
export const revealItem: Variants = {
  hidden: { opacity: 0, y: REVEAL_OFFSET },
  shown: { opacity: 1, y: 0, transition: { duration: duration.reveal, ease: ease.out } },
};

/** Transición estándar de las piezas de una ilustración al entrar. */
export const artEnter: Transition = { duration: duration.slow, ease: ease.out };

/**
 * Bucle ambiental suave (flotar). Se usa solo mientras la ilustración está
 * en pantalla y nunca con movimiento reducido.
 * @param delay - Desfase para que los grupos no floten al unísono.
 * @returns Transición en bucle infinito.
 */
export function ambientLoop(delay = 0): Transition {
  return { duration: duration.ambient, ease: ease.inOut, repeat: Infinity, repeatType: "mirror", delay };
}
