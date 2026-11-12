"use client";

import type { MouseEvent } from "react";
import { AppWindow, ArrowLeft, Columns3, Info, LifeBuoy, ListTodo, PenTool, Users, type LucideIcon } from "lucide-react";
import { LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import { docSections } from "./docs-content";
import type { DocBlock, DocSection } from "./docs-content";

// Un icono por sección: el índice y la tarjeta comparten el mismo lenguaje visual.
const sectionIcons: Record<string, LucideIcon> = {
  "que-es": Columns3,
  roles: Users,
  tareas: ListTodo,
  pizarras: PenTool,
  espacio: AppWindow,
  ayuda: LifeBuoy,
};

/**
 * Bloque de contenido de la documentación.
 * @param props - Bloque a renderizar (párrafo, pasos o nota).
 * @returns El bloque con su formato.
 */
function DocBlockView({ block }: { block: DocBlock }) {
  if (block.type === "steps") {
    return (
      <ol className="doc-steps">
        {block.items.map((item) => <li key={item}>{item}</li>)}
      </ol>
    );
  }
  if (block.type === "note") {
    return (
      <div className="doc-note" role="note">
        <Info size={17} aria-hidden />
        <p>{block.text}</p>
      </div>
    );
  }
  return <p className="doc-paragraph">{block.text}</p>;
}

/**
 * Una sección de la documentación con su ancla para el índice.
 * @param props - Sección a renderizar y su posición para el escalonado.
 * @returns La sección en tarjeta con icono, título y bloques.
 */
function DocSectionView({ section, index }: { section: DocSection; index: number }) {
  const Icon = sectionIcons[section.id] ?? Info;
  return (
    <m.section
      className="doc-section"
      id={`docs-${section.id}`}
      aria-labelledby={`docs-title-${section.id}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.38, delay: Math.min(index, 4) * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="doc-section-head">
        <span className="doc-icon" aria-hidden><Icon size={19} /></span>
        <h2 id={`docs-title-${section.id}`}>{section.title}</h2>
      </div>
      {section.blocks.map((block, blockIndex) => <DocBlockView key={`${section.id}-${blockIndex}`} block={block} />)}
    </m.section>
  );
}

/**
 * Documentación de Aula Kanban: página propia dentro de la app, visible
 * para todos los roles, con botón claro de vuelta al tablero.
 * @param props - Acción «Volver a Kanban».
 * @returns La página de documentación con héroe, índice y secciones.
 */
export default function DocumentationView({ onBack }: { onBack: () => void }) {
  function goToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`docs-${id}`)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  return (
    <MotionConfig reducedMotion="user">
    <LazyMotion features={domAnimation}>
      <div className="docs-view">
        <header className="docs-hero">
          <button type="button" className="docs-back" onClick={onBack}><ArrowLeft size={16} aria-hidden /> Volver a Kanban</button>
          <p className="eyebrow"><span /> Documentación</p>
          <h1>Documentación de Aula Kanban</h1>
          <p className="docs-intro">Cómo va el tablero, qué puede hacer cada rol y dónde están las herramientas del grupo.</p>
        </header>
        <div className="docs-layout">
          <nav className="docs-index" aria-label="Secciones de la documentación">
            <p>En esta página</p>
            <ul>
              {docSections.map((section) => <li key={section.id}><a href={`#docs-${section.id}`} onClick={(event) => goToSection(event, section.id)}>{section.title}</a></li>)}
            </ul>
          </nav>
          <div className="docs-body">
            {docSections.map((section, index) => <DocSectionView key={section.id} section={section} index={index} />)}
          </div>
        </div>
      </div>
    </LazyMotion>
    </MotionConfig>
  );
}
