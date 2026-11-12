"use client";

import { m } from "motion/react";
import { Info, Lightbulb, ShieldAlert, type LucideIcon } from "lucide-react";
import type { DocBlock, DocNoteTone } from "../content";
import { revealItem } from "../motion";

const noteIcons: Record<DocNoteTone, LucideIcon> = { info: Info, tip: Lightbulb, warning: ShieldAlert };
const noteLabels: Record<DocNoteTone, string> = { info: "Nota", tip: "Consejo", warning: "Importante" };

/**
 * Bloque de contenido del cuerpo de una sección. Cada bloque entra con el
 * escalonado de su sección (variants heredadas del contenedor).
 * @param props - Bloque a renderizar.
 * @returns El bloque con su semántica: párrafo, lista ordenada, definiciones o nota.
 */
export function DocBlockView({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "steps":
      return (
        <ol className="doc-steps">
          {block.items.map((item) => <m.li key={item} variants={revealItem}>{item}</m.li>)}
        </ol>
      );
    case "definitions":
      return (
        <dl className="doc-definitions">
          {block.items.map((item) => (
            <m.div key={item.term} className="doc-definition" variants={revealItem}>
              <dt>{item.term}</dt>
              <dd>{item.text}</dd>
            </m.div>
          ))}
        </dl>
      );
    case "note": {
      const Icon = noteIcons[block.tone];
      return (
        <m.div className={`doc-note doc-note--${block.tone}`} role="note" aria-label={noteLabels[block.tone]} variants={revealItem}>
          <Icon size={17} aria-hidden />
          <p>{block.text}</p>
        </m.div>
      );
    }
    default:
      return <m.p className="doc-paragraph" variants={revealItem}>{block.text}</m.p>;
  }
}
