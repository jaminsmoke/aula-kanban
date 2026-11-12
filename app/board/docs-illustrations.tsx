"use client";

import type { ComponentType } from "react";
import { m } from "motion/react";

// Paleta Aula: violeta de marca, lavanda y ámbar de acento.
const VIOLET = "#5839be";
const VIOLET_DARK = "#42299c";
const PALE = "#eeebfb";
const LAVENDER = "#b7a8ee";
const AMBER = "#febc2e";
const LINE = "#e7e4ef";

const float = { animate: { y: [0, -5, 0] }, transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const } };
const floatSlow = { animate: { y: [0, -4, 0] }, transition: { duration: 5.5, repeat: Infinity, ease: "easeInOut" as const } };

/** Mini tablero del héroe: tres columnas con tarjetas y botón «+» ámbar. */
/**
 * Mini tablero del héroe: tres columnas con tarjetas y botón «+» ámbar.
 * @returns El SVG decorativo de la escena.
 */
function HeroArt() {
  return (
    <svg viewBox="0 0 320 240" aria-hidden focusable="false">
      <rect x="14" y="18" width="292" height="204" rx="16" fill="#ffffff" opacity="0.12" />
      <rect x="14" y="18" width="292" height="44" rx="16" fill="#ffffff" opacity="0.1" />
      <circle cx="40" cy="40" r="5" fill="#ffffff" opacity="0.75" />
      <circle cx="60" cy="40" r="5" fill="#ffffff" opacity="0.5" />
      <circle cx="80" cy="40" r="5" fill="#ffffff" opacity="0.32" />
      <g fill="#ffffff">
        <rect x="34" y="84" width="66" height="118" rx="10" opacity="0.92" />
        <rect x="118" y="84" width="66" height="118" rx="10" opacity="0.92" />
        <rect x="202" y="84" width="66" height="118" rx="10" opacity="0.92" />
      </g>
      <m.g {...float}>
        <rect x="42" y="96" width="50" height="20" rx="6" fill={PALE} />
        <rect x="42" y="124" width="50" height="20" rx="6" fill={VIOLET} />
        <rect x="126" y="96" width="50" height="20" rx="6" fill={AMBER} />
        <rect x="210" y="96" width="50" height="20" rx="6" fill={PALE} />
      </m.g>
      <m.g {...floatSlow}>
        <rect x="126" y="124" width="50" height="20" rx="6" fill={LAVENDER} />
        <rect x="210" y="124" width="50" height="20" rx="6" fill={VIOLET} />
        <rect x="42" y="152" width="50" height="20" rx="6" fill={PALE} />
      </m.g>
      <g fill={AMBER}>
        <circle cx="264" cy="196" r="18" />
        <path d="M264 186v20M254 196h20" stroke="#42299c" strokeWidth="4.5" strokeLinecap="round" />
      </g>
      <path d="M44 66q20-12 40 0" stroke="#febc2e" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="1 8" />
    </svg>
  );
}

/** Qué es: tablero con tres columnas y flecha de progreso. */
/**
 * Qué es: tablero con tres columnas y flecha de progreso.
 * @returns El SVG decorativo de la escena.
 */
function QueEsArt() {
  return (
    <svg viewBox="0 0 260 200" aria-hidden focusable="false">
      <rect x="16" y="14" width="228" height="172" rx="14" fill={PALE} opacity="0.55" />
      <g>
        <rect x="30" y="34" width="58" height="132" rx="10" fill="#ffffff" />
        <rect x="96" y="34" width="58" height="132" rx="10" fill="#ffffff" />
        <rect x="162" y="34" width="58" height="132" rx="10" fill="#ffffff" />
      </g>
      <m.g {...float}>
        <rect x="38" y="48" width="42" height="18" rx="5" fill={VIOLET} />
        <rect x="38" y="74" width="42" height="18" rx="5" fill={PALE} />
        <rect x="104" y="48" width="42" height="18" rx="5" fill={AMBER} />
        <rect x="104" y="74" width="42" height="18" rx="5" fill={LAVENDER} />
        <rect x="170" y="48" width="42" height="18" rx="5" fill={PALE} />
        <rect x="170" y="74" width="42" height="18" rx="5" fill={VIOLET} />
      </m.g>
      <path d="M84 120q22-14 44 0" stroke={VIOLET_DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="1 7" />
      <path d="M130 114l5 7-8 2z" fill={VIOLET_DARK} />
    </svg>
  );
}

/** Roles: jerarquía de un círculo grande y tres pequeños conectados. */
/**
 * Roles: jerarquía de un círculo grande y tres pequeños conectados.
 * @returns El SVG decorativo de la escena.
 */
function RolesArt() {
  return (
    <svg viewBox="0 0 260 200" aria-hidden focusable="false">
      <path d="M130 96v26M78 122v18M130 122v18M182 122v18" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      <path d="M78 140h104" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      <m.g {...float}>
        <circle cx="130" cy="66" r="34" fill={VIOLET} />
        <path d="M118 56l4 8 8-10 8 10 4-8-2 14h-20z" fill={AMBER} />
      </m.g>
      <g fill="#ffffff" stroke={VIOLET} strokeWidth="3">
        <circle cx="78" cy="160" r="20" />
        <circle cx="130" cy="160" r="20" />
        <circle cx="182" cy="160" r="20" />
      </g>
      <g fill={VIOLET}>
        <circle cx="78" cy="160" r="5" />
        <circle cx="130" cy="160" r="5" />
        <circle cx="182" cy="160" r="5" />
      </g>
      <circle cx="78" cy="160" r="30" fill="none" stroke={PALE} strokeWidth="3" strokeDasharray="1 7" />
    </svg>
  );
}

/** Tareas: tarjeta con casillas marcadas y barra de progreso. */
/**
 * Tareas: tarjeta con casillas marcadas y barra de progreso.
 * @returns El SVG decorativo de la escena.
 */
function TareasArt() {
  return (
    <svg viewBox="0 0 260 200" aria-hidden focusable="false">
      <rect x="30" y="22" width="200" height="156" rx="14" fill="#ffffff" stroke={LINE} strokeWidth="2" />
      <rect x="48" y="42" width="120" height="10" rx="5" fill={PALE} />
      <g stroke={VIOLET} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="48" y="70" width="18" height="18" rx="5" />
        <m.path d="M52 79l4 4 8-9" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }} />
        <rect x="48" y="100" width="18" height="18" rx="5" />
        <m.path d="M52 109l4 4 8-9" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.45 }} />
        <rect x="48" y="130" width="18" height="18" rx="5" />
      </g>
      <g fill={LINE}>
        <rect x="78" y="74" width="90" height="9" rx="4.5" />
        <rect x="78" y="104" width="70" height="9" rx="4.5" />
        <rect x="78" y="134" width="80" height="9" rx="4.5" />
      </g>
      <rect x="48" y="162" width="164" height="8" rx="4" fill={PALE} />
      <m.rect x="48" y="162" width="164" height="8" rx="4" fill={AMBER} initial={{ width: 0 }} whileInView={{ width: 110 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }} />
    </svg>
  );
}

/** Pizarras: trazo dibujándose solo sobre la pizarra. */
/**
 * Pizarras: trazo dibujándose solo sobre la pizarra.
 * @returns El SVG decorativo de la escena.
 */
function PizarrasArt() {
  return (
    <svg viewBox="0 0 260 200" aria-hidden focusable="false">
      <rect x="18" y="16" width="224" height="168" rx="14" fill={PALE} opacity="0.55" />
      <m.path
        d="M40 150c18-30 26-58 56-58s38 26 60 12 44-34 64-20"
        fill="none" stroke={VIOLET} strokeWidth="4" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
      />
      <circle cx="104" cy="52" r="16" fill="none" stroke={AMBER} strokeWidth="4" />
      <path d="M188 44l18 30h-36z" fill="none" stroke={VIOLET_DARK} strokeWidth="4" strokeLinejoin="round" />
      <m.g animate={{ x: [-8, 0, 14, 26, 40], transition: { duration: 3.2, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" } }}>
        <path d="M44 150l10-16-3 18z" fill={AMBER} />
      </m.g>
    </svg>
  );
}

/** Mi espacio: ventana de escritorio con apps y tienda. */
/**
 * Mi espacio: ventana de escritorio con apps y tienda.
 * @returns El SVG decorativo de la escena.
 */
function EspacioArt() {
  return (
    <svg viewBox="0 0 260 200" aria-hidden focusable="false">
      <rect x="26" y="20" width="208" height="160" rx="14" fill="#ffffff" stroke={LINE} strokeWidth="2" />
      <rect x="26" y="20" width="208" height="36" rx="14" fill={PALE} />
      <circle cx="46" cy="38" r="5" fill={VIOLET} />
      <circle cx="66" cy="38" r="5" fill={LAVENDER} />
      <circle cx="86" cy="38" r="5" fill={AMBER} />
      <m.g {...float}>
        <rect x="46" y="74" width="56" height="56" rx="12" fill={VIOLET} />
        <rect x="114" y="74" width="56" height="56" rx="12" fill={PALE} />
        <rect x="46" y="142" width="56" height="26" rx="8" fill={LAVENDER} />
      </m.g>
      <m.g {...floatSlow}>
        <path d="M182 116l26 14-26 14-26-14z" fill={AMBER} />
      </m.g>
    </svg>
  );
}

/** Ayuda: salvavidas con pulso suave. */
/**
 * Ayuda: salvavidas con pulso suave.
 * @returns El SVG decorativo de la escena.
 */
function AyudaArt() {
  return (
    <svg viewBox="0 0 260 200" aria-hidden focusable="false">
      <m.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="130" cy="100" r="58" fill="none" stroke={AMBER} strokeWidth="16" />
        <circle cx="130" cy="100" r="58" fill="none" stroke="#ffffff" strokeWidth="16" strokeDasharray="0 90.5" strokeDashoffset="45" />
        <g stroke={VIOLET} strokeWidth="10" strokeLinecap="round">
          <path d="M130 48v22M130 130v22M78 100h22M160 100h22" />
        </g>
        <circle cx="130" cy="100" r="30" fill={PALE} />
      </m.g>
      <path d="M58 44q10-8 22-8M202 156q-10 8-22 8" stroke={LAVENDER} strokeWidth="4" strokeLinecap="round" strokeDasharray="1 8" />
    </svg>
  );
}

/**
 * Ilustración decorativa de una sección de la documentación.
 * @param props - Identificador de la sección en el contenido.
 * @returns El SVG animado de la sección, o null si no tiene ilustración.
 */
export const docsIllustrations: Record<string, ComponentType> = {
  "que-es": QueEsArt,
  roles: RolesArt,
  tareas: TareasArt,
  pizarras: PizarrasArt,
  espacio: EspacioArt,
  ayuda: AyudaArt,
};

/**
 * Ilustración grande del héroe de la documentación.
 * @returns El SVG del héroe.
 */
export function DocsHeroArt() {
  return <HeroArt />;
}
