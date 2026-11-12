"use client";

import { ArrowLeft, Info } from "lucide-react";
import { docSections } from "./docs-content";
import type { DocBlock, DocSection } from "./docs-content";

/**
 * Un bloque de contenido de la documentación.
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
 * @param props - Sección a renderizar.
 * @returns La sección con título y bloques.
 */
function DocSectionView({ section }: { section: DocSection }) {
  return (
    <section className="doc-section" id={`docs-${section.id}`} aria-labelledby={`docs-title-${section.id}`}>
      <h2 id={`docs-title-${section.id}`}>{section.title}</h2>
      {section.blocks.map((block, index) => <DocBlockView key={`${section.id}-${index}`} block={block} />)}
    </section>
  );
}

/**
 * Documentación de Aula Kanban: página propia dentro de la app, visible
 * para todos los roles, con botón claro de vuelta al tablero.
 * @param props - Acción «Volver a Kanban».
 * @returns La página de documentación con índice y secciones.
 */
export default function DocumentationView({ onBack }: { onBack: () => void }) {
  return (
    <div className="docs-view">
      <div className="docs-back-row">
        <button type="button" className="docs-back" onClick={onBack}><ArrowLeft size={16} /> Volver a Kanban</button>
      </div>
      <header className="docs-header">
        <p className="eyebrow"><span /> Documentación</p>
        <h1>Documentación de Aula Kanban</h1>
        <p className="docs-intro">Cómo va el tablero, qué puede hacer cada rol y dónde están las herramientas del grupo.</p>
      </header>
      <div className="docs-layout">
        <nav className="docs-index" aria-label="Secciones de la documentación">
          <p>En esta página</p>
          <ul>
            {docSections.map((section) => <li key={section.id}><a href={`#docs-${section.id}`}>{section.title}</a></li>)}
          </ul>
        </nav>
        <div className="docs-body">
          {docSections.map((section) => <DocSectionView key={section.id} section={section} />)}
        </div>
      </div>
    </div>
  );
}
