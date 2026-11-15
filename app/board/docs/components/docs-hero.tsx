"use client";

import { m } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { docsHero } from "../content";
import { HeroArt } from "../illustrations";
import { revealContainer, revealItem } from "../motion";

/**
 * Héroe de la documentación: vuelta al tablero, título y la ilustración del
 * tablero. Entra escalonado al abrir la página.
 * @param props - Acción «Volver a Clase» opcional.
 * @returns La cabecera de la página.
 */
export function DocsHero({ onBack }: { onBack?: () => void }) {
  return (
    <m.header className="docs-hero" variants={revealContainer} initial="hidden" animate="shown">
      <div className="docs-hero-text">
        {onBack && <m.button type="button" className="docs-back" onClick={onBack} variants={revealItem}>
          <ArrowLeft size={16} aria-hidden /> {docsHero.back}
        </m.button>}
        <m.p className="eyebrow" variants={revealItem}><span /> {docsHero.eyebrow}</m.p>
        <m.h1 variants={revealItem}>{docsHero.title} <span className="docs-title-accent">{docsHero.titleAccent}</span></m.h1>
        <m.p className="docs-intro" variants={revealItem}>{docsHero.intro}</m.p>
      </div>
      <div className="docs-hero-art">
        <HeroArt />
      </div>
    </m.header>
  );
}
