"use client";

import { m } from "motion/react";
import { docAnchor, type DocSection } from "../content";
import { revealContainer, revealItem, revealViewport } from "../motion";
import { sectionVisuals } from "../section-visuals";
import { DocBlockView } from "./doc-blocks";

/**
 * Tarjeta de una sección: cabecera (icono, título y entradilla) junto a su
 * ilustración y, debajo, el cuerpo a todo el ancho. La entrada se escalona:
 * cabecera → ilustración → bloques.
 * @param props - Sección a renderizar.
 * @returns La sección con su ancla para el índice.
 */
export function DocSectionView({ section }: { section: DocSection }) {
  const { icon: Icon, Illustration } = sectionVisuals[section.id];
  const anchor = docAnchor(section.id);
  return (
    <m.section
      className="doc-section"
      id={anchor}
      aria-labelledby={`${anchor}-title`}
      variants={revealContainer}
      initial="hidden"
      whileInView="shown"
      viewport={revealViewport}
    >
      <div className="doc-section-intro">
        <m.div className="doc-section-head" variants={revealItem}>
          <span className="doc-icon" aria-hidden><Icon size={20} /></span>
          <h2 id={`${anchor}-title`} tabIndex={-1}>{section.title}</h2>
        </m.div>
        <m.p className="doc-lead" variants={revealItem}>{section.lead}</m.p>
      </div>
      <m.div className="doc-art" variants={revealItem}>
        <Illustration />
      </m.div>
      <div className="doc-section-body">
        {section.blocks.map((block, index) => <DocBlockView key={`${section.id}-${index}`} block={block} />)}
      </div>
    </m.section>
  );
}
