"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Reveal from "reveal.js";
import "reveal.js/reveal.css";
import { Download, FolderOpen, Play, Presentation, RotateCcw, Save } from "lucide-react";
import type { StoreRole } from "../types";
import { useVersionedDraft } from "../use-versioned-draft";
import { useWindowClose } from "../../store/window-close-guard";
import { aulaFileName } from "../../../../lib/domain/aula-documentos/filename";
import VersionConflictDialog from "../version-conflict-dialog";
import UnsavedChangesDialog from "../unsaved-changes-dialog";
import {
  DEFAULT_MARKDOWN,
  PRESETS,
  exportPresentationHtml,
  parseInline,
  parsePresentationDocument,
  parseSlides,
  presentationTitle,
  presetInfo,
  serializePresentation,
  type InlineSegment,
  type PresentationDocument,
  type PresentationSlide,
  type PresetId,
  type SlideBlock,
} from "./presentaciones-model";
import "./presentaciones.css";

/**
 * Presentaciones: editor Markdown, vista previa y modo presentación.
 * @param props - Proyecto activo y rol del usuario.
 * @returns La ventana de la app.
 */
export default function PresentacionesApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("clase");
  const [presenting, setPresenting] = useState(false);
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const revealRef = useRef<HTMLDivElement>(null);
  const readOnly = role === "guest";
  const forceClose = useWindowClose();

  const draft = useVersionedDraft<PresentationDocument>({
    projectId,
    appId: "presentaciones",
    getValue: () => serializePresentation(markdown),
    applyLoaded: (loaded) => {
      const parsed = parsePresentationDocument(loaded);
      if (!parsed) return false;
      setMarkdown(parsed.markdown);
      return true;
    },
    readOnly,
    formatCopy: (document) => ({
      contents: JSON.stringify(document, null, 2),
      type: "application/json;charset=utf-8",
      fileName: aulaFileName(presentationTitle(document.markdown), "json", "presentacion")
        .replace(/\.json$/, "-recuperacion.json"),
    }),
    onCloseBlocked: () => setClosePromptOpen(true),
  });

  const slides = useMemo(() => parseSlides(markdown), [markdown]);
  const currentPreset = presetInfo(selectedPreset);

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
  }, [markdown, presenting]);

  function editMarkdown(value: string) {
    if (readOnly) return;
    setMarkdown(value);
    draft.markDirty("Presentación modificada.");
  }

  function applyPreset() {
    if (readOnly) return;
    if (draft.dirty && !window.confirm("Se reemplazará la presentación actual. ¿Continuar?")) return;
    setMarkdown(currentPreset.markdown);
    draft.markDirty(`Plantilla «${currentPreset.label}» aplicada.`);
  }

  async function savePresentation() {
    if (readOnly) return;
    await draft.save(false);
  }

  async function saveAndClose() {
    setClosePromptOpen(false);
    if (await draft.save(false)) forceClose();
  }

  async function loadPresentation() {
    if (draft.loading || draft.saving || draft.conflict) return;
    if (draft.dirty && !window.confirm("Se reemplazará la presentación actual. ¿Continuar?")) return;
    const loaded = await draft.reload();
    if (loaded) {
      draft.setStatus("Presentación cargada.");
    } else if (!draft.error) {
      draft.setStatus("No hay una presentación guardada válida; se mantiene la actual.");
    }
  }

  function reset() {
    if (readOnly) return;
    if (draft.dirty && !window.confirm("Se reiniciará la presentación actual. ¿Continuar?")) return;
    setMarkdown(currentPreset.markdown);
    draft.markDirty("Presentación reiniciada.");
  }

  function exportHtml() {
    try {
      const title = presentationTitle(markdown);
      const blob = new Blob([exportPresentationHtml(markdown)], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = aulaFileName(title, "html", "presentacion");
      anchor.click();
      URL.revokeObjectURL(url);
      draft.setStatus("HTML descargado.");
    } catch {
      draft.setStatus("No se pudo preparar el HTML de la presentación.");
    }
  }

  const statusText = draft.loading
    ? "Cargando presentación…"
    : draft.ready && draft.updatedAt === null && !draft.dirty && !draft.saveFailed && !draft.error
      ? "Presentación de ejemplo lista. Guarda para conservarla."
      : draft.dirty
        ? `${draft.status} Cambios sin guardar.`
        : draft.status;
  const busy = draft.loading || draft.saving;

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
          <button type="button" onClick={savePresentation} disabled={readOnly || busy || Boolean(draft.conflict)}>
            <Save size={15} aria-hidden /> {draft.saving ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={loadPresentation} disabled={busy || Boolean(draft.conflict)}>
            <FolderOpen size={15} aria-hidden /> Cargar
          </button>
          <button type="button" onClick={exportHtml}><Download size={15} aria-hidden /> Exportar HTML</button>
          <button type="button" onClick={reset} disabled={readOnly || busy || Boolean(draft.conflict)}>
            <RotateCcw size={15} aria-hidden /> Reiniciar
          </button>
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
            <div className="presentaciones-preset">
              <label htmlFor="presentaciones-preset">Plantilla</label>
              <select
                id="presentaciones-preset"
                value={selectedPreset}
                onChange={(event) => setSelectedPreset(event.target.value as PresetId)}
                disabled={readOnly || busy || Boolean(draft.conflict)}
              >
                {PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
              </select>
              <button type="button" onClick={applyPreset} disabled={readOnly || busy || Boolean(draft.conflict)}>Aplicar</button>
              <span>{currentPreset.description}</span>
            </div>
            <textarea
              className="presentaciones-textarea"
              value={markdown}
              onChange={(event) => editMarkdown(event.target.value)}
              aria-label="Editor de diapositivas"
              readOnly={readOnly}
              spellCheck={false}
            />
            <p className="presentaciones-status" role="status">
              {statusText}
            </p>
            {draft.error && <p className="presentaciones-error" role="alert">{draft.error}</p>}
            {readOnly && <p className="presentaciones-readonly">Modo lectura: no puedes editar ni guardar esta presentación.</p>}
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

      <UnsavedChangesDialog
        open={closePromptOpen}
        busy={draft.saving}
        notice={draft.saveFailed ? draft.status : null}
        onStay={() => setClosePromptOpen(false)}
        onDiscard={() => {
          setClosePromptOpen(false);
          forceClose();
        }}
        onSave={() => { void saveAndClose(); }}
      />

      <VersionConflictDialog
        open={Boolean(draft.conflict)}
        serverUpdatedAt={draft.conflict?.serverUpdatedAt ?? null}
        notice={draft.conflictNotice}
        busy={draft.saving}
        onDownload={() => { draft.downloadCopy(); }}
        onReload={() => { void draft.reloadServerVersion(); }}
        onKeepMine={() => { void draft.keepMineVersion(); }}
      />
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
