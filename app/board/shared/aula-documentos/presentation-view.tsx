"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Reveal from "reveal.js";
import type { AulaPresentationTheme } from "../../../../lib/domain/aula-documentos/document";
import { useDialogFocus } from "../use-dialog-focus";
import "reveal.js/reveal.css";
import "./presentation.css";

/** Props de la vista de presentación. */
export type PresentationViewProps = {
  title: string;
  slides: string[];
  theme?: AulaPresentationTheme;
  notes?: Record<string, string>;
  onExit: () => void;
};

/**
 * Presenta las diapositivas con reveal.js.
 * @param props - Título, HTML de cada diapositiva y cierre.
 * @returns La capa de presentación a pantalla completa.
 */
export function PresentationView({ title, slides, theme = "aula", notes = {}, onExit }: PresentationViewProps) {
  const revealRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  useDialogFocus(true, onExit, dialogRef);

  useEffect(() => {
    const element = revealRef.current;
    if (!element) return;
    const deck = new Reveal(element, {
      embedded: true,
      hash: false,
      center: false,
      controls: true,
      progress: true,
      slideNumber: true,
      keyboard: true,
      touch: true,
      transition: "fade",
      width: 960,
      height: 700,
      margin: 0.06,
      respondToHashChanges: false,
    });
    void deck.initialize();
    const onSlideChanged = (event: Event) => {
      const index = (event as Event & { indexh?: number }).indexh;
      if (typeof index === "number") setActiveSlide(index);
    };
    deck.on("slidechanged", onSlideChanged);
    element.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      deck.off("slidechanged", onSlideChanged);
      document.body.style.overflow = previousOverflow;
      deck.destroy();
    };
  }, [onExit, slides]);

  return (
    <div ref={dialogRef} className={`aula-presentation aula-presentation-theme-${theme}`} role="dialog" aria-modal="true" aria-label={`Presentación: ${title}`}>
      <button type="button" className="aula-presentation-exit" onClick={onExit} aria-label="Salir de la presentación">
        <X size={16} aria-hidden />
        Salir
      </button>
      <button
        type="button"
        className="aula-presentation-notes-toggle"
        onClick={() => setShowNotes((current) => !current)}
        aria-pressed={showNotes}
      >
        Notas
      </button>
      {showNotes ? (
        <aside className="aula-presentation-notes" aria-label="Notas del orador">
          <h2>Notas · diapositiva {activeSlide + 1}</h2>
          <p>{notes[String(activeSlide)] || "Sin notas para esta diapositiva."}</p>
        </aside>
      ) : null}
      <div ref={revealRef} className="reveal aula-presentation-reveal" tabIndex={-1}>
        <div className="slides">
          {slides.map((html, index) => (
            <section
              key={`slide-${index}`}
              className="aula-presentation-slide"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
