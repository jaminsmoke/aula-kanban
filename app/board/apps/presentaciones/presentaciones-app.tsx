"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Reveal from "reveal.js";
import "reveal.js/reveal.css";
import "reveal.js/theme/white.css";
import { Play, Presentation, RotateCcw } from "lucide-react";
import {
  DEFAULT_MARKDOWN,
  parseInline,
  parseSlides,
  type InlineSegment,
  type PresentationSlide,
  type SlideBlock,
} from "./presentaciones-model";
import "./presentaciones.css";

/**
 * Presentaciones: editor Markdown, vista previa y modo presentación.
 * @returns La ventana de la app.
 */
export default function PresentacionesApp() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [presenting, setPresenting] = useState(false);
  const [status, setStatus] = useState("Edita el Markdown y revisa la vista previa.");
  const revealRef = useRef<HTMLDivElement>(null);
  const slides = useMemo(() => parseSlides(markdown), [markdown]);

  useEffect(() => {
    if (!presenting) return;
    const element = revealRef.current;
    if (!element) return;
    const deck = new Reveal(element, {
      embedded: true,
      hash: false,
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPresenting(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      deck.destroy();
    };
  }, [presenting]);

  function reset() {
    setMarkdown(DEFAULT_MARKDOWN);
    setStatus("Presentación reiniciada.");
  }

  return (
    <div className="presentaciones-app">
      <header className="presentaciones-toolbar">
        <div className="presentaciones-heading">
          <span className="presentaciones-mark" aria-hidden><Presentation size={18} strokeWidth={2} /></span>
          <span>
            <strong>Presentaciones</strong>
            <small>Escribe, revisa y presenta</small>
          </span>
        </div>
        <div className="presentaciones-actions">
          <button type="button" onClick={() => setPresenting(true)}><Play size={15} aria-hidden /> Presentar</button>
          <button type="button" onClick={reset}><RotateCcw size={15} aria-hidden /> Reiniciar</button>
        </div>
      </header>

      {presenting ? (
        <div className="presentaciones-presentation" aria-label="Modo presentación">
          <div ref={revealRef} className="reveal presentaciones-reveal">
            <div className="slides">
              {slides.map((slide, index) => (
                <section key={`${index}-${slide.title}`} className="presentaciones-slide">
                  <SlideContent slide={slide} />
                </section>
              ))}
            </div>
          </div>
          <button type="button" className="presentaciones-exit" onClick={() => setPresenting(false)}>
            Salir
          </button>
        </div>
      ) : (
        <div className="presentaciones-layout">
          <section className="presentaciones-editor" aria-label="Editor Markdown">
            <div className="presentaciones-panel-head">
              <h2>Markdown</h2>
              <span>Separa diapositivas con <code>---</code></span>
            </div>
            <textarea
              className="presentaciones-textarea"
              value={markdown}
              onChange={(event) => {
                setMarkdown(event.target.value);
                setStatus("");
              }}
              aria-label="Editor de diapositivas"
              spellCheck={false}
            />
            <p className="presentaciones-status" role="status">
              {status || `${slides.length} ${slides.length === 1 ? "diapositiva" : "diapositivas"}.`}
            </p>
          </section>

          <section className="presentaciones-preview" aria-label="Vista previa de diapositivas">
            <div className="presentaciones-panel-head">
              <h2>Vista previa</h2>
              <span>{slides.length} {slides.length === 1 ? "diapositiva" : "diapositivas"}</span>
            </div>
            <div className="presentaciones-preview-list">
              {slides.map((slide, index) => (
                <article className="presentaciones-preview-slide" key={`${index}-${slide.title}`} aria-label={`Diapositiva ${index + 1}`}>
                  <span className="presentaciones-preview-number">{index + 1}</span>
                  <SlideContent slide={slide} />
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/**
 * Pinta una diapositiva completa.
 * @param props - Diapositiva parseada.
 * @returns Los bloques de la diapositiva.
 */
function SlideContent({ slide }: { slide: PresentationSlide }) {
  if (!slide.blocks.length) {
    return <p className="presentaciones-empty">Escribe algo para ver la diapositiva.</p>;
  }
  return (
    <div className="presentaciones-slide-content">
      {slide.blocks.map((block, index) => <SlideBlockView block={block} key={index} />)}
    </div>
  );
}

/**
 * Pinta un bloque de Markdown.
 * @param props - Bloque que se renderiza.
 * @returns El elemento correspondiente.
 */
function SlideBlockView({ block }: { block: SlideBlock }) {
  if (block.type === "heading") {
    const Tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
    return <Tag><InlineText segments={parseInline(block.text)} /></Tag>;
  }
  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag>
        {block.items.map((item, index) => (
          <li key={index}><InlineText segments={parseInline(item)} /></li>
        ))}
      </Tag>
    );
  }
  if (block.type === "quote") {
    return <blockquote><InlineText segments={parseInline(block.text)} /></blockquote>;
  }
  if (block.type === "code") {
    return <pre><code>{block.text}</code></pre>;
  }
  return <p><InlineText segments={parseInline(block.text)} /></p>;
}

/**
 * Pinta fragmentos inline sin interpretar HTML.
 * @param props - Fragmentos de texto.
 * @returns El texto con sus marcas.
 */
function InlineText({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.href) {
          return <a key={index} href={segment.href} target="_blank" rel="noreferrer noopener">{segment.text}</a>;
        }
        if (segment.code) return <code key={index}>{segment.text}</code>;
        if (segment.bold) return <strong key={index}>{segment.text}</strong>;
        if (segment.italic) return <em key={index}>{segment.text}</em>;
        return <span key={index}>{segment.text}</span>;
      })}
    </>
  );
}
