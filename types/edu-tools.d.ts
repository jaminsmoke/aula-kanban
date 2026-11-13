// @smst/edu-tools publica los componentes por subruta sin tipos en los `exports`
// de cada entrada, así que declaramos solo lo que usa la app nativa.

declare module "@smst/edu-tools/styles";

declare module "@smst/edu-tools/calculator" {
  import type { ComponentType } from "react";
  /** Calculadora básica con display y operaciones. */
  export const Calculator: ComponentType<Record<string, never>>;
}

declare module "@smst/edu-tools/protractor" {
  import type { ComponentType } from "react";
  /** Transportador de ángulos arrastrable. */
  export const Protractor: ComponentType<{ windowId?: string; radiusPx?: number }>;
}

declare module "@smst/edu-tools/ruler" {
  import type { ComponentType } from "react";
  /** Regla graduada en píxeles y centímetros. */
  export const Ruler: ComponentType<{ windowId?: string; lengthPx?: number }>;
}
