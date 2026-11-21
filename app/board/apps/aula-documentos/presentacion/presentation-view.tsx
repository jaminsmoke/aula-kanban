"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Reveal from "reveal.js";
import type { AulaPresentationTheme } from "../../../../../lib/domain/aula-documentos/document";
import { useDialogFocus } from "../../../shared/use-dialog-focus";
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
  const deckRef = useRef<InstanceType<typeof Reveal> | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showPresenter, setShowPresenter] = useState(false);
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
    deckRef.current = deck;
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
      deckRef.current = null;
    };
  }, [onExit, slides]);

  useEffect(() => {
    deckRef.current?.layout();
  }, [showPresenter]);

  const nextSlide = slides[activeSlide + 1];

  return (
    <div
      ref={dialogRef}
      className={`aula-presentation${showPresenter ? " has-presenter" : ""} aula-presentation-theme-${theme}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Presentación: ${title}`}
    >
      <button type="button" className="aula-presentation-exit" onClick={onExit} aria-label="Salir de la presentación">
        <X size={16} aria-hidden />
        Salir
      </button>
      <button
        type="button"
        className="aula-presentation-presenter-toggle"
        onClick={() => setShowPresenter((current) => !current)}
        aria-pressed={showPresenter}
        aria-controls="aula-presentation-presenter"
      >
        Presentador
      </button>
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
      {showPresenter ? (
        <aside id="aula-presentation-presenter" className="aula-presentation-presenter" aria-label="Vista de presentador">
          <header className="aula-presentation-presenter-head">
            <h2>Vista de presentador</h2>
            <span aria-live="polite">{activeSlide + 1} / {slides.length}</span>
          </header>
          <section className="aula-presentation-presenter-section" aria-label="Notas del orador" aria-live="polite">
            <h3>Notas · diapositiva {activeSlide + 1}</h3>
            <p>{notes[String(activeSlide)] || "Sin notas para esta diapositiva."}</p>
          </section>
          <section className="aula-presentation-presenter-section" aria-label="Siguiente diapositiva">
            <h3>Siguiente diapositiva</h3>
            {nextSlide ? (
              <div className="aula-presentation-next-frame" aria-hidden>
                <div
                  className="aula-presentation-slide aula-presentation-next-slide"
                  dangerouslySetInnerHTML={{ __html: nextSlide }}
                />
              </div>
            ) : (
              <p>Última diapositiva.</p>
            )}
          </section>
        </aside>
      ) : null}
    </div>
  );
}
