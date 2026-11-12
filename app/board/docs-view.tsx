"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { AppWindow, ArrowLeft, Columns3, Info, LifeBuoy, ListTodo, PenTool, Users, type LucideIcon } from "lucide-react";
import { LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import { docSections } from "./docs-content";
import type { DocBlock, DocSection } from "./docs-content";
import { DocsHeroArt, docsIllustrations } from "./docs-illustrations";

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
 * @param props - Bloque a renderizar (párrafo, pasos o nota) y si abre la sección.
 * @returns El bloque con su formato.
 */
function DocBlockView({ block, lead }: { block: DocBlock; lead: boolean }) {
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
  return <p className={`doc-paragraph${lead ? " doc-lead" : ""}`}>{block.text}</p>;
}

/**
 * Una sección de la documentación con su ancla para el índice y su
 * ilustración alternando lado como en una presentación.
 * @param props - Sección a renderizar y su posición para el escalonado.
 * @returns La sección en tarjeta con icono, título, bloques e ilustración.
 */
function DocSectionView({ section, index }: { section: DocSection; index: number }) {
  const Icon = sectionIcons[section.id] ?? Info;
  const Illustration = docsIllustrations[section.id];
  return (
    <m.section
      className={`doc-section${Illustration ? " doc-section--art" : ""}${index % 2 === 1 ? " doc-section--flip" : ""}`}
      id={`docs-${section.id}`}
      aria-labelledby={`docs-title-${section.id}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="doc-text">
        <div className="doc-section-head">
          <span className="doc-icon" aria-hidden><Icon size={19} /></span>
          <h2 id={`docs-title-${section.id}`}>{section.title}</h2>
        </div>
        {section.blocks.map((block, blockIndex) => <DocBlockView key={`${section.id}-${blockIndex}`} block={block} lead={blockIndex === 0 && block.type === "paragraph"} />)}
      </div>
      {Illustration && (
        <div className="doc-art" role="img" aria-label={`Ilustración: ${section.title}`}>
          <Illustration />
        </div>
      )}
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
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id.replace("docs-", ""));
        }
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    for (const section of docSections) {
      const el = document.getElementById(`docs-${section.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

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
          <div className="docs-hero-text">
            <button type="button" className="docs-back" onClick={onBack}><ArrowLeft size={16} aria-hidden /> Volver a Kanban</button>
            <p className="eyebrow"><span /> Documentación</p>
            <h1>Documentación de <span className="docs-title-accent">Aula Kanban</span></h1>
            <p className="docs-intro">Cómo va el tablero, qué puede hacer cada rol y dónde están las herramientas del grupo.</p>
          </div>
          <div className="docs-hero-art" role="img" aria-label="Ilustración: tablero Kanban con columnas de tareas">
            <DocsHeroArt />
          </div>
        </header>
        <div className="docs-layout">
          <nav className="docs-index" aria-label="Secciones de la documentación">
            <p>En esta página</p>
            <ul>
              {docSections.map((section) => <li key={section.id}><a href={`#docs-${section.id}`} aria-current={activeId === section.id ? "true" : undefined} onClick={(event) => goToSection(event, section.id)}>{section.title}</a></li>)}
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
