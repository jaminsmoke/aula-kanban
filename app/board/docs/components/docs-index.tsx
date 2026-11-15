"use client";

import type { MouseEvent } from "react";
import { docAnchor, docsHero, type DocSection } from "../content";
import { sectionVisuals } from "../section-visuals";
import { useActiveSection } from "../use-active-section";

/**
 * Lleva a una sección respetando el movimiento reducido y deja el foco en su
 * título, para que teclado y lector de pantalla continúen desde ahí.
 * @param event - Clic en el enlace del índice.
 * @param anchor - Id del elemento de la sección.
 */
function goToSection(event: MouseEvent<HTMLAnchorElement>, anchor: string) {
  const target = document.getElementById(anchor);
  if (!target) return;
  event.preventDefault();
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  document.getElementById(`${anchor}-title`)?.focus({ preventScroll: true });
}

/**
 * Índice «En esta página»: lateral fijo en escritorio y fila desplazable en
 * móvil, con la sección activa resaltada.
 * @param props - Secciones del contenido.
 * @returns La navegación del índice.
 */
export function DocsIndex({ sections }: { sections: DocSection[] }) {
  const anchors = sections.map((section) => docAnchor(section.id));
  const active = useActiveSection(anchors);
  return (
    <nav className="docs-index" aria-label={docsHero.indexLabel}>
      <p className="docs-index-title" aria-hidden>{docsHero.indexTitle}</p>
      <ul>
        {sections.map((section) => {
          const anchor = docAnchor(section.id);
          const Icon = sectionVisuals[section.id].icon;
          return (
            <li key={section.id}>
              <a href={`#${anchor}`} aria-current={active === anchor ? "location" : undefined} onClick={(event) => goToSection(event, anchor)}>
                <Icon size={16} aria-hidden />
                <span>{section.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
