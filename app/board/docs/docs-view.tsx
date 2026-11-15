"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import "./docs.css";
import { docSections } from "./content";
import { DocsHero } from "./components/docs-hero";
import { DocsIndex } from "./components/docs-index";
import { DocSectionView } from "./components/doc-section";

/**
 * Documentación de Aula Kanban: visible para todos los roles. En Ajustes se
 * integra sin botón de vuelta; la página pública conserva su acción.
 * @param props - Acción «Volver a Clase» opcional.
 * @returns La página de documentación con héroe, índice y secciones.
 */
export default function DocumentationView({ onBack }: { onBack?: () => void }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <div className="docs-view">
          <DocsHero onBack={onBack} />
          <div className="docs-layout">
            <DocsIndex sections={docSections} />
            <div className="docs-body">
              {docSections.map((section) => <DocSectionView key={section.id} section={section} />)}
            </div>
          </div>
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}
