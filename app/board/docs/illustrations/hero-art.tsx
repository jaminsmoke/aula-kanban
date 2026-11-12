"use client";

import { m } from "motion/react";
import { ArtFrame, Appear, useArt } from "./art-frame";
import { duration, ease } from "../motion";

const COLUMN_X = [30, 116, 202] as const;
const COLUMN_WIDTH = 78;
const CARD_WIDTH = COLUMN_WIDTH - 16;
const COLUMN_STEP = COLUMN_X[1] - COLUMN_X[0];

/**
 * Tarjeta que recorre las columnas (Por hacer → En curso → Hecho): cuenta
 * en bucle la idea central del tablero mientras el héroe está en pantalla.
 * @returns La tarjeta viajera.
 */
function TravellingCard() {
  const { live } = useArt();
  return (
    <m.rect
      x={COLUMN_X[0] + 8} y={150} width={CARD_WIDTH} height={20} rx={6}
      className="a-amber"
      animate={live ? { x: [0, 0, COLUMN_STEP, COLUMN_STEP, COLUMN_STEP * 2, COLUMN_STEP * 2] } : { x: 0 }}
      transition={live ? { duration: 7, times: [0, 0.18, 0.38, 0.58, 0.78, 1], ease: ease.out, repeat: Infinity, repeatDelay: 1.2, delay: 1 } : { duration: duration.base }}
    />
  );
}

/**
 * Ilustración del héroe: mini tablero con tres columnas, tarjetas que entran
 * escalonadas y una tarjeta que avanza de columna en columna.
 * @returns El SVG del héroe.
 */
export function HeroArt() {
  return (
    <ArtFrame label="Tablero Kanban con tres columnas y una tarjeta que avanza de columna en columna" viewBox="0 0 320 230" className="doc-art-svg--hero">
      <Appear from={0.96}>
        <rect x="14" y="14" width="292" height="204" rx="16" className="a-glass" />
        <rect x="14" y="14" width="292" height="40" rx="16" className="a-glass" />
        <circle cx="38" cy="34" r="5" className="a-white" opacity="0.75" />
        <circle cx="56" cy="34" r="5" className="a-white" opacity="0.5" />
        <circle cx="74" cy="34" r="5" className="a-white" opacity="0.32" />
      </Appear>
      {COLUMN_X.map((x, column) => (
        <Appear key={x} order={1 + column} from={0.92}>
          <rect x={x} y="72" width={COLUMN_WIDTH} height="130" rx="10" className="a-white" opacity="0.94" />
          <rect x={x + 8} y="82" width="34" height="6" rx="3" className="a-lavender" />
        </Appear>
      ))}
      <Appear order={4}>
        {[["a-pale", "a-violet"], ["a-lavender"], ["a-pale", "a-violet"]].map((tones, column) =>
          tones.map((tone, row) => <rect key={`${column}-${row}`} x={COLUMN_X[column] + 8} y={98 + row * 26} width={CARD_WIDTH} height="20" rx="6" className={tone} />),
        )}
      </Appear>
      <Appear order={5}>
        <TravellingCard />
      </Appear>
      <Appear order={6} from={0.4}>
        <circle cx="282" cy="200" r="18" className="a-amber" />
        <path d="M282 190v20M272 200h20" className="s-violet-dark" strokeWidth="4.5" strokeLinecap="round" />
      </Appear>
    </ArtFrame>
  );
}
