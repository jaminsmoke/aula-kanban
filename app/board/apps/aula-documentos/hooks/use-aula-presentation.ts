import { useCallback, useRef, useState } from "react";
import {
  AULA_DOCUMENT_SCHEMA_VERSION,
  parseAulaDocument,
  type AulaDocument,
  type AulaPresentationTheme,
} from "../../../../../lib/domain/aula-documentos/document";
import { documentToMarkdown, markdownToDocument } from "../../../../../lib/domain/aula-documentos/markdown";
import { buildPresentationSlides } from "../../../../../lib/domain/aula-documentos/presentation";
import { collectMermaidCodes, renderAulaContentHtml, renderMermaidSvgs, buildAulaPresentationHtml } from "../../../shared/aula-documentos/export-html";
import { getMermaidRenderer } from "../../../shared/aula-documentos/mermaid-renderer";
import { loadExportImages } from "../utils/document-assets";
import { downloadTextFile } from "../../../shared/ui/download";
import { aulaFileName } from "../../../../../lib/domain/aula-documentos/filename";

type PresentationDeps = {
  currentDocument: () => AulaDocument | null;
  title: string;
  presentationTheme: AulaPresentationTheme;
  presentationNotes: Record<string, string>;
  setPresentationTheme: (theme: AulaPresentationTheme) => void;
  setPresentationNotes: (notes: Record<string, string> | ((current: Record<string, string>) => Record<string, string>)) => void;
  applyDocument: (document: AulaDocument) => void;
  markChanged: (message?: string) => void;
  setStatus: (message: string) => void;
};

/**
 * Prepara presentaciones, su vista previa y la fuente Markdown.
 * @param deps - Documento, tema y notas de la presentación.
 * @returns Estado y acciones de presentación.
 */
export function useAulaPresentation({
  currentDocument,
  title,
  presentationTheme,
  presentationNotes,
  setPresentationTheme,
  setPresentationNotes,
  applyDocument,
  markChanged,
  setStatus,
}: PresentationDeps) {
  const [preparingPresentation, setPreparingPresentation] = useState(false);
  const [presentation, setPresentation] = useState<{ title: string; slides: string[] } | null>(null);
  const [exportingPresentation, setExportingPresentation] = useState(false);
  const [slidePreview, setSlidePreview] = useState<{ title: string; slides: string[]; index: number } | null>(null);
  const [markdownSourceOpen, setMarkdownSourceOpen] = useState(false);
  const [markdownSourceDraft, setMarkdownSourceDraft] = useState("");
  const [markdownSourceError, setMarkdownSourceError] = useState<string | null>(null);
  const slidePreviewRef = useRef<HTMLElement>(null);
  const markdownSourceRef = useRef<HTMLElement>(null);

  /**
   * Construye el HTML de cada diapositiva con sus diagramas.
   * @param document - Documento validado.
   * @returns Diapositivas listas para presentar o previsualizar.
   */
  async function buildPresentationHtml(document: AulaDocument): Promise<string[]> {
    const slides = buildPresentationSlides(document.content);
    const content = { type: "doc", content: slides.flatMap((slide) => slide.content) };
    const svgByCode = await renderMermaidSvgs(
      collectMermaidCodes(content),
      (code) => getMermaidRenderer().render(code),
    );
    const images = await loadExportImages(content);
    const failedImages = new Set(images.failed);
    return slides.map((slide) => renderAulaContentHtml(
      { type: "doc", content: slide.content },
      svgByCode,
      images.sources,
      failedImages,
    ));
  }

  /**
   * Construye y abre la presentación del documento actual.
   */
  async function startPresentation() {
    const document = currentDocument();
    if (!document) return;
    setPreparingPresentation(true);
    setStatus("Preparando presentación…");
    try {
      const html = await buildPresentationHtml(document);
      setPresentation({
        title: document.title.trim() || "Aula Documentos",
        slides: html,
      });
      setStatus("Presentación abierta.");
    } catch {
      setStatus("No se pudo preparar la presentación.");
    } finally {
      setPreparingPresentation(false);
    }
  }

  /**
   * Abre una vista previa con navegación entre diapositivas.
   */
  async function openSlidePreview() {
    const document = currentDocument();
    if (!document) return;
    setPreparingPresentation(true);
    setStatus("Preparando vista previa…");
    try {
      const html = await buildPresentationHtml(document);
      setSlidePreview({
        title: document.title.trim() || "Aula Documentos",
        slides: html,
        index: 0,
      });
      setStatus(`Vista previa abierta: ${html.length} ${html.length === 1 ? "diapositiva" : "diapositivas"}.`);
    } catch {
      setStatus("No se pudo preparar la vista previa.");
    } finally {
      setPreparingPresentation(false);
    }
  }

  /**
   * Abre la fuente Markdown del documento para editarla como diapositivas.
   */
  function openMarkdownSource() {
    const document = currentDocument();
    if (!document) return;
    setMarkdownSourceDraft(documentToMarkdown(document));
    setMarkdownSourceError(null);
    setMarkdownSourceOpen(true);
  }

  /**
   * Aplica la fuente Markdown al documento actual conservando tema y notas.
   */
  function applyMarkdownSource() {
    const converted = markdownToDocument(markdownSourceDraft, {
      slideBreaks: true,
      stripTitleHeading: true,
      titleFallback: title || "Presentación",
    });
    const parsed = parseAulaDocument({
      schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
      title: converted.title,
      content: converted.content,
      presentation: {
        theme: presentationTheme,
        ...(Object.keys(presentationNotes).length ? { notes: presentationNotes } : {}),
      },
    });
    if (!parsed.ok) {
      setMarkdownSourceError(parsed.message);
      return;
    }
    applyDocument(parsed.document);
    markChanged("Fuente Markdown aplicada. Guárdala para conservarla.");
    setMarkdownSourceOpen(false);
  }

  /**
   * Cambia el tema de la presentación y lo guarda con el documento.
   * @param theme - Nuevo tema.
   */
  function changePresentationTheme(theme: AulaPresentationTheme) {
    setPresentationTheme(theme);
    markChanged("Tema de presentación actualizado.");
  }

  /**
   * Actualiza las notas de una diapositiva.
   * @param index - Índice de la diapositiva.
   * @param value - Texto de la nota.
   */
  function changeSlideNote(index: number, value: string) {
    setPresentationNotes((current) => {
      const next = { ...current };
      if (value) next[String(index)] = value;
      else delete next[String(index)];
      return next;
    });
    markChanged("Notas de presentación actualizadas.");
  }

  /**
   * Exporta una presentación HTML estática con tema y notas.
   */
  async function exportPresentation() {
    const document = currentDocument();
    if (!document) return;
    setExportingPresentation(true);
    setStatus("Preparando la presentación exportada…");
    try {
      const slides = await buildPresentationHtml(document);
      const html = buildAulaPresentationHtml(document, slides, {
        theme: presentationTheme,
        notes: presentationNotes,
        includeNotes: true,
      });
      downloadTextFile(
        html,
        "text/html;charset=utf-8",
        aulaFileName(`${document.title} presentación`, "html"),
      );
      setStatus("Presentación exportada.");
    } catch {
      setStatus("No se pudo exportar la presentación.");
    } finally {
      setExportingPresentation(false);
    }
  }

  const closePresentation = useCallback(() => {
    setPresentation(null);
    setStatus("Presentación cerrada.");
  }, [setStatus]);

  return {
    preparingPresentation,
    presentation,
    exportingPresentation,
    slidePreview,
    setSlidePreview,
    markdownSourceOpen,
    setMarkdownSourceOpen,
    markdownSourceDraft,
    setMarkdownSourceDraft,
    markdownSourceError,
    slidePreviewRef,
    markdownSourceRef,
    startPresentation,
    openSlidePreview,
    openMarkdownSource,
    applyMarkdownSource,
    changePresentationTheme,
    changeSlideNote,
    exportPresentation,
    closePresentation,
  };
}
