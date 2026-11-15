"use client";

import { m } from "motion/react";
import { ArtFrame, Appear, Draw, Float, useArt } from "./art-frame";
import { ease } from "../motion";

/**
 * Qué es: tablero de tres columnas cuyas tarjetas entran por columnas.
 * @returns El SVG de la sección.
 */
export function BoardArt() {
  const columns = [30, 101, 172];
  const cards = [["a-violet", "a-pale"], ["a-amber", "a-lavender"], ["a-pale", "a-violet"]];
  return (
    <ArtFrame label="Tablero con tres columnas de tarjetas">
      <rect x="14" y="14" width="232" height="172" rx="16" className="a-pale" opacity="0.6" />
      {columns.map((x, column) => (
        <Appear key={x} order={column}>
          <rect x={x} y="32" width="58" height="136" rx="10" className="a-white" />
          {cards[column].map((tone, row) => <rect key={tone + row} x={x + 8} y={46 + row * 26} width="42" height="18" rx="5" className={tone} />)}
        </Appear>
      ))}
      <Appear order={3}>
        <path d="M66 140q35-18 70 0" className="s-violet-dark" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="1 7" />
        <path d="M138 134l6 8-9 2z" className="a-violet-dark" />
      </Appear>
    </ArtFrame>
  );
}

/**
 * Roles: un responsable arriba y tres miembros conectados que aparecen en orden.
 * @returns El SVG de la sección.
 */
export function RolesArt() {
  const members = [70, 130, 190];
  return (
    <ArtFrame label="Esquema de roles: un responsable conectado con tres miembros">
      <Draw d="M130 84v24M70 108h120M70 108v14M130 108v14M190 108v14" className="s-line" strokeWidth={3} order={1} seconds={0.5} />
      <Float amplitude={3}>
        <Appear from={0.6}>
          <circle cx="130" cy="56" r="28" className="a-violet" />
          <path d="M119 48l3 8 8-9 8 9 3-8-2 12h-18z" className="a-amber" />
        </Appear>
      </Float>
      {members.map((cx, i) => (
        <Appear key={cx} order={2 + i} from={0.5}>
          <circle cx={cx} cy="142" r="18" className="a-white s-violet" strokeWidth="3" />
          <circle cx={cx} cy="136" r="5" className="a-violet" />
          <path d={`M${cx - 9} 154a9 8 0 0 1 18 0z`} className="a-violet" />
        </Appear>
      ))}
    </ArtFrame>
  );
}

/**
 * Barra de progreso que se llena (escala en X, sin tocar el layout del SVG).
 * @returns La barra animada.
 */
function ProgressFill() {
  const { entered, reduced } = useArt();
  return (
    <m.rect
      x="48" y="160" width="164" height="8" rx="4" className="a-amber"
      style={{ transformBox: "fill-box", transformOrigin: "left center" }}
      initial={reduced ? false : { scaleX: 0 }}
      animate={entered ? { scaleX: 0.67 } : undefined}
      transition={{ duration: 0.8, ease: ease.out, delay: 0.5 }}
    />
  );
}

/**
 * Tareas: lista que se marca sola y barra de progreso que avanza.
 * @returns El SVG de la sección.
 */
export function TasksArt() {
  const rows = [70, 100, 130];
  return (
    <ArtFrame label="Lista de tareas con dos casillas marcadas y una barra de progreso">
      <rect x="30" y="22" width="200" height="156" rx="14" className="a-white s-line" strokeWidth="2" />
      <rect x="48" y="40" width="110" height="10" rx="5" className="a-pale" />
      {rows.map((y, i) => (
        <g key={y}>
          <rect x="48" y={y} width="18" height="18" rx="5" className="s-violet" strokeWidth="3" fill="none" />
          <rect x="78" y={y + 4} width={[96, 72, 84][i]} height="9" rx="4.5" className="a-line" />
        </g>
      ))}
      <Draw d="M52 79l4 4 8-9" className="s-violet" order={1} seconds={0.35} />
      <Draw d="M52 109l4 4 8-9" className="s-violet" order={3} seconds={0.35} />
      <rect x="48" y="160" width="164" height="8" rx="4" className="a-pale" />
      <ProgressFill />
    </ArtFrame>
  );
}

/**
 * Calendario: rejilla del mes con un día resaltado y una tarea marcada.
 * @returns El SVG de la sección.
 */
export function CalendarArt() {
  const days = [0, 1, 2, 3, 4, 5, 6];
  const weeks = [0, 1, 2, 3];
  return (
    <ArtFrame label="Calendario del mes con una tarea marcada en su fecha de entrega">
      <rect x="26" y="20" width="208" height="160" rx="14" className="a-white s-line" strokeWidth="2" />
      <path d="M40 20h180a14 14 0 0 1 14 14v16H26V34a14 14 0 0 1 14-14z" className="a-violet" />
      <rect x="47" y="31" width="64" height="9" rx="4.5" className="a-white" opacity="0.85" />
      {days.map((day) => <rect key={day} x={42 + day * 26} y="66" width="10" height="6" rx="3" className="a-line" />)}
      {weeks.map((week) => days.map((day) => (
        <rect
          key={`${week}-${day}`}
          x={42 + day * 26} y={84 + week * 22} width="14" height="14" rx="4"
          className={week === 1 && day === 3 ? "a-amber" : "a-pale"}
        />
      )))}
      <Appear order={2}>
        <circle cx="127" cy="113" r="11" className="s-violet" strokeWidth="2.5" fill="none" />
      </Appear>
    </ArtFrame>
  );
}

/**
 * Proyectos: lista de proyectos con uno marcado y un engranaje de ajustes.
 * @returns El SVG de la sección.
 */
export function ProjectsArt() {
  const rows = [52, 90, 128];
  return (
    <ArtFrame label="Lista de proyectos con uno activo y un engranaje de ajustes">
      <rect x="18" y="16" width="224" height="168" rx="14" className="a-pale" opacity="0.6" />
      {rows.map((y, i) => (
        <Appear key={y} order={i}>
          <rect x="36" y={y} width="132" height="30" rx="8" className={i === 1 ? "a-white" : "a-pale"} />
          <rect x="48" y={y + 11} width="10" height="8" rx="2" className={i === 1 ? "a-violet" : "a-line"} />
          <rect x="66" y={y + 10} width={[60, 74, 52][i]} height="9" rx="4.5" className="a-line" />
          {i === 1 && <path d="M140 62l4 4 8-8" fill="none" className="s-violet" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        </Appear>
      ))}
      <Appear order={3} from={0.5}>
        <circle cx="196" cy="132" r="24" className="a-amber" />
        <circle cx="196" cy="132" r="8" fill="none" className="s-white" strokeWidth="5" />
        <path d="M196 100v9M196 155v9M164 132h9M219 132h9" className="s-white" strokeWidth="6" strokeLinecap="round" />
      </Appear>
    </ArtFrame>
  );
}

/**
 * Personas: tres fichas con su avatar y un sobre de invitación que aparece.
 * @returns El SVG de la sección.
 */
export function PeopleArt() {
  const cards = [40, 100, 160];
  return (
    <ArtFrame label="Fichas de personas del proyecto y una invitación por correo">
      <rect x="18" y="16" width="224" height="168" rx="14" className="a-pale" opacity="0.6" />
      {cards.map((x, i) => (
        <Appear key={x} order={i}>
          <rect x={x} y="40" width="52" height="76" rx="10" className="a-white" />
          <circle cx={x + 26} cy="62" r="12" className="a-violet" />
          <circle cx={x + 26} cy="58" r="4" className="a-white" />
          <path d={`M${x + 18} 70a8 7 0 0 1 16 0z`} className="a-white" />
          <rect x={x + 11} y="84" width="30" height="6" rx="3" className="a-line" />
          <rect x={x + 11} y="96" width="20" height="6" rx="3" className="a-pale" />
        </Appear>
      ))}
      <Appear order={3} from={0.5}>
        <rect x="82" y="124" width="96" height="48" rx="10" className="a-white" />
        <rect x="82" y="124" width="96" height="48" rx="10" fill="none" className="s-amber" strokeWidth="3" />
        <path d="M84 132l46 26 46-26" fill="none" className="s-amber" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="180" cy="124" r="12" className="a-violet" />
        <path d="M174 124l4 4 7-8" fill="none" className="s-white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </Appear>
    </ArtFrame>
  );
}

const SKETCH_PATH = "M40 150c18-30 26-58 56-58s38 26 60 12 44-34 64-20";

/**
 * Lápiz que recorre exactamente el trazo de la pizarra (offset-path),
 * sincronizado con el dibujo.
 * @returns El lápiz animado.
 */
function Pencil() {
  const { entered, live, reduced } = useArt();
  return (
    <m.g
      style={{ offsetPath: `path("${SKETCH_PATH}")`, offsetRotate: "0deg" }}
      initial={reduced ? false : { offsetDistance: "0%" }}
      animate={entered ? { offsetDistance: live ? ["0%", "100%"] : "100%" } : undefined}
      transition={live ? SKETCH_LOOP : { duration: SKETCH_LOOP.duration, ease: SKETCH_LOOP.ease }}
    >
      <path d="M0 0l10-16 6 4-10 16-7 2z" className="a-amber" />
    </m.g>
  );
}

/** Bucle del dibujo: trazo y lápiz comparten exactamente el mismo ritmo. */
const SKETCH_LOOP = { duration: 2.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.2 } as const;

/**
 * Trazo a mano alzada que se dibuja al entrar y se repite mientras se ve.
 * @returns El path animado.
 */
function SketchStroke() {
  const { entered, live, reduced } = useArt();
  return (
    <m.path
      d={SKETCH_PATH} fill="none" className="s-violet" strokeWidth="4" strokeLinecap="round"
      initial={reduced ? false : { pathLength: 0 }}
      animate={entered ? { pathLength: live ? [0, 1] : 1 } : undefined}
      transition={live ? SKETCH_LOOP : { duration: SKETCH_LOOP.duration, ease: SKETCH_LOOP.ease }}
    />
  );
}

/**
 * Pizarras: un trazo que se dibuja con el lápiz encima y formas a mano alzada.
 * @returns El SVG de la sección.
 */
export function WhiteboardArt() {
  return (
    <ArtFrame label="Pizarra con un trazo a mano alzada, un círculo y un triángulo">
      <rect x="18" y="16" width="224" height="168" rx="14" className="a-pale" opacity="0.6" />
      <Draw d="M104 36a16 16 0 1 1 0 32a16 16 0 1 1 0-32" className="s-amber" strokeWidth={4} order={0} seconds={0.6} />
      <Draw d="M188 44l18 30h-36z" className="s-violet-dark" strokeWidth={4} order={2} seconds={0.5} />
      <SketchStroke />
      <Pencil />
    </ArtFrame>
  );
}

/**
 * Mi espacio: ventana de escritorio con apps que aparecen y la tienda flotando.
 * @returns El SVG de la sección.
 */
export function SpaceArt() {
  return (
    <ArtFrame label="Ventana de Mi espacio con iconos de aplicaciones y la tienda">
      <rect x="26" y="20" width="208" height="160" rx="14" className="a-white s-line" strokeWidth="2" />
      <path d="M26 34a14 14 0 0 1 14-14h180a14 14 0 0 1 14 14v22H26z" className="a-pale" />
      <circle cx="46" cy="38" r="5" className="a-violet" />
      <circle cx="64" cy="38" r="5" className="a-lavender" />
      <circle cx="82" cy="38" r="5" className="a-amber" />
      <Appear order={0}><rect x="46" y="72" width="52" height="52" rx="12" className="a-violet" /></Appear>
      <Appear order={1}><rect x="110" y="72" width="52" height="52" rx="12" className="a-lavender" /></Appear>
      <Appear order={2}><rect x="46" y="136" width="116" height="26" rx="8" className="a-pale" /></Appear>
      <Float amplitude={5} delay={0.6}>
        <Appear order={3} from={0.5}>
          <path d="M198 108l24 13-24 13-24-13z" className="a-amber" />
          <path d="M174 121v14l24 13v-14zM222 121v14l-24 13v-14z" className="a-amber" opacity="0.7" />
        </Appear>
      </Float>
    </ArtFrame>
  );
}

/**
 * Onda que se expande desde el salvavidas mientras se ve.
 * @returns El círculo del pulso.
 */
function PulseRing() {
  const { live } = useArt();
  return (
    <m.circle
      cx="130" cy="100" r="62" fill="none" className="s-lavender" strokeWidth="3"
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
      initial={{ opacity: 0 }}
      animate={live ? { scale: [1, 1.28], opacity: [0.7, 0] } : { opacity: 0 }}
      transition={live ? { duration: 2.4, ease: "easeOut", repeat: Infinity, repeatDelay: 1.6 } : { duration: 0.2 }}
    />
  );
}

/**
 * Ayuda: salvavidas que aparece y emite un pulso suave mientras se ve.
 * @returns El SVG de la sección.
 */
/**
 * Servidor MCP: robot con antena y cable que conecta con el tablero.
 * @returns El SVG de la sección.
 */
export function McpArt() {
  return (
    <ArtFrame label="Robot conectado al tablero">
      <Appear order={1}>
        <rect x="70" y="64" width="120" height="82" rx="22" className="a-white" />
        <rect x="70" y="64" width="120" height="82" rx="22" fill="none" className="s-violet" strokeWidth="3" />
        <path d="M130 64v-16" className="s-violet" strokeWidth="4" strokeLinecap="round" />
        <circle cx="130" cy="42" r="7" className="a-amber" />
        <circle cx="108" cy="100" r="9" className="a-violet" />
        <circle cx="152" cy="100" r="9" className="a-violet" />
        <path d="M112 126q18 12 36 0" fill="none" className="s-violet-dark" strokeWidth="4" strokeLinecap="round" />
      </Appear>
      <Appear order={2}>
        <path d="M70 105H42M218 105h28" className="s-violet" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 8" />
      </Appear>
      <Appear order={3}>
        <rect x="24" y="92" width="18" height="26" rx="6" className="a-violet" />
        <rect x="218" y="92" width="18" height="26" rx="6" className="a-violet" />
      </Appear>
    </ArtFrame>
  );
}

/**
 * Autorización OAuth: llave que aparece y gira el aro de la cerradura.
 * @returns El SVG de la sección.
 */
export function OAuthArt() {
  return (
    <ArtFrame label="Llave de autorización">
      <Appear order={1}>
        <circle cx="98" cy="98" r="46" fill="none" className="s-violet" strokeWidth="6" />
        <circle cx="98" cy="98" r="14" fill="none" className="s-violet" strokeWidth="6" />
        <Draw d="M126 126l34 34M160 160l-10 10M172 172l-12 12" className="s-amber" strokeWidth={8} order={1} seconds={0.5} />
      </Appear>
      <Appear order={2}>
        <circle cx="196" cy="52" r="20" className="a-amber" />
        <path d="M188 52l6 6 12-12" fill="none" className="s-white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </Appear>
    </ArtFrame>
  );
}

/**
 * Novedades: destello sobre una lista de notas que aparecen en orden.
 * @returns El SVG de la sección.
 */
export function NewsArt() {
  const rows = [104, 124, 144];
  return (
    <ArtFrame label="Destello de novedad sobre una lista de notas">
      <rect x="18" y="16" width="224" height="168" rx="14" className="a-pale" opacity="0.6" />
      <Appear>
        <rect x="42" y="36" width="176" height="130" rx="12" className="a-white" />
        <path d="M130 46l6 14 15 2-11 10 3 15-13-8-13 8 3-15-11-10 15-2z" className="a-amber" />
      </Appear>
      {rows.map((y, i) => (
        <Appear key={y} order={i + 1} from={0.4}>
          <circle cx="62" cy={y} r="4" className="a-violet" />
          <rect x="76" y={y - 4} width={[104, 88, 96][i]} height="8" rx="4" className="a-line" />
        </Appear>
      ))}
    </ArtFrame>
  );
}

/**
 * Enlaces: dos eslabones enganchados y una barra con la dirección de la vista.
 * @returns El SVG de la sección.
 */
export function LinksArt() {
  return (
    <ArtFrame label="Enlaces de cada vista y copia del Site">
      <rect x="18" y="16" width="224" height="168" rx="14" className="a-pale" opacity="0.6" />
      <Appear>
        <path d="M96 92a16 16 0 0 1 0 22l-14 14a16 16 0 0 1-22-22l7-7" fill="none" className="s-violet" strokeWidth="8" strokeLinecap="round" />
        <path d="M164 108a16 16 0 0 1 0-22l14-14a16 16 0 0 1 22 22l-7 7" fill="none" className="s-amber" strokeWidth="8" strokeLinecap="round" />
      </Appear>
      <Appear order={1} from={0.4}>
        <rect x="60" y="130" width="140" height="34" rx="8" className="a-white" />
        <circle cx="78" cy="147" r="5" className="a-violet" />
        <rect x="92" y="143" width="72" height="8" rx="4" className="a-line" />
        <path d="M166 147h12" className="s-line" strokeWidth="3" strokeLinecap="round" />
      </Appear>
    </ArtFrame>
  );
}

/**
 * Problemas: tarjeta de aviso con un triángulo de error y una lista de
 * soluciones que aparece después.
 * @returns El SVG de la sección.
 */
export function TroubleArt() {
  return (
    <ArtFrame label="Aviso de error con una lista de soluciones">
      <rect x="18" y="16" width="224" height="168" rx="14" className="a-pale" opacity="0.6" />
      <Appear>
        <rect x="38" y="32" width="184" height="136" rx="12" className="a-white" />
        <path d="M130 50l30 50h-60z" className="a-amber" />
        <path d="M130 68v16M130 92v2" className="s-white" strokeWidth="5" strokeLinecap="round" />
      </Appear>
      <Appear order={1} from={0.4}>
        <rect x="62" y="114" width="124" height="9" rx="4.5" className="a-line" />
        <rect x="62" y="131" width="94" height="9" rx="4.5" className="a-pale" />
        <rect x="62" y="148" width="108" height="9" rx="4.5" className="a-pale" />
        <path d="M48 118l4 5 8-9" fill="none" className="s-violet" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </Appear>
    </ArtFrame>
  );
}

/**
 * Ayuda: salvavidas que aparece con el aro y las aspas.
 * @returns El SVG de la sección.
 */
export function HelpArt() {
  return (
    <ArtFrame label="Salvavidas de ayuda">
      <PulseRing />
      <Appear from={0.6}>
        <circle cx="130" cy="100" r="58" fill="none" className="s-amber" strokeWidth="16" />
        <circle cx="130" cy="100" r="58" fill="none" className="s-white" strokeWidth="16" strokeDasharray="20 71.1" strokeDashoffset="-35.55" />
        <path d="M130 48v22M130 130v22M78 100h22M160 100h22" className="s-violet" strokeWidth="10" strokeLinecap="round" />
        <circle cx="130" cy="100" r="30" className="a-pale" />
      </Appear>
    </ArtFrame>
  );
}
