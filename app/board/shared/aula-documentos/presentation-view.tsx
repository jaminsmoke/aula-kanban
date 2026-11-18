"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import Reveal from "reveal.js";
import "reveal.js/reveal.css";
import "./presentation.css";

/** Props de la vista de presentación. */
export type PresentationViewProps = {
  title: string;
  slides: string[];
  onExit: () => void;
};

/**
 * Presenta las diapositivas con reveal.js.
 * @param props - Título, HTML de cada diapositiva y cierre.
 * @returns La capa de presentación a pantalla completa.
 */
export function PresentationView({ title, slides, onExit }: PresentationViewProps) {
  const revealRef = useRef<HTMLDivElement>(null);

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
    element.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      deck.destroy();
    };
  }, [onExit, slides]);

  return (
    <div className="aula-presentation" role="dialog" aria-modal="true" aria-label={`Presentación: ${title}`}>
      <button type="button" className="aula-presentation-exit" onClick={onExit} aria-label="Salir de la presentación">
        <X size={16} aria-hidden />
        Salir
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
    </div>
  );
}
