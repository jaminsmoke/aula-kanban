"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Files,
  FileUp,
  FolderOpen,
  Maximize2,
  Presentation,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  OFFICE_FILE_ACCEPT,
  formatFileSize,
  officeErrorMessage,
  officeFormatLabel,
  validateOfficeFile,
  type OfficeFileInfo,
  type OfficeFormat,
} from "./office-model";
import "./office-viewer.css";

type LoadedOfficeFile = {
  info: OfficeFileInfo;
  bytes: ArrayBuffer;
  id: number;
};

type ViewerPosition = {
  label: "Página" | "Diapositiva" | "Hoja";
  current: number;
  total: number;
};

type ViewerControls = {
  destroy: () => void;
  zoomIn: () => void | Promise<void>;
  zoomOut: () => void | Promise<void>;
  fitWidth: () => void | Promise<void>;
  fitPage: () => void | Promise<void>;
  previous?: () => void | Promise<void>;
  next?: () => void | Promise<void>;
};

/**
 * Icono del formato de archivo.
 * @param props - Formato y tamaño.
 * @returns El icono correspondiente.
 */
function OfficeFormatIcon({ format, size = 17 }: { format: OfficeFormat; size?: number }) {
  if (format === "xlsx") return <FileSpreadsheet size={size} aria-hidden />;
  if (format === "pptx") return <Presentation size={size} aria-hidden />;
  return <FileText size={size} aria-hidden />;
}

/**
 * Visor Office: abre documentos locales de Office en solo lectura.
 * @returns La ventana con selector, controles y visor.
 */
export default function VisorOfficeApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<ViewerControls | null>(null);
  const loadIdRef = useRef(0);
  const noteId = useId();
  const [loaded, setLoaded] = useState<LoadedOfficeFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<ViewerPosition | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!loaded) return;

    const host = hostRef.current;
    if (!host) return;
    const isSpreadsheet = loaded.info.format === "xlsx";
    const element = isSpreadsheet ? host : document.createElement("canvas");
    if (!isSpreadsheet) {
      (element as HTMLCanvasElement).className = "visor-office-canvas";
      host.appendChild(element as HTMLCanvasElement);
    }

    let cancelled = false;
    let destroy: (() => void) | null = null;
    let refit: (() => void | Promise<void>) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame = 0;
    setLoading(true);
    setError(null);
    setPosition(null);
    setScale(1);

    const init = async () => {
      try {
        let controls: ViewerControls;

        if (loaded.info.format === "docx") {
          const { DocxViewer } = await import("@silurus/ooxml/docx");
          if (cancelled) return;
          const viewer = new DocxViewer(element as HTMLCanvasElement, {
            fonts: [],
            enableTextSelection: true,
            enableHyperlinks: false,
            onPageChange: (index, total) => {
              if (!cancelled) setPosition({ label: "Página", current: index + 1, total });
            },
            onScaleChange: (value) => {
              if (!cancelled) setScale(value);
            },
            onError: (viewerError) => {
              if (!cancelled) {
                setError(officeErrorMessage(viewerError));
                setLoading(false);
              }
            },
          });
          destroy = () => viewer.destroy();
          await viewer.load(loaded.bytes);
          if (cancelled) return;
          await viewer.fitWidth();
          if (cancelled) return;
          refit = () => viewer.fitWidth();
          controls = {
            destroy: () => viewer.destroy(),
            zoomIn: () => viewer.zoomIn(),
            zoomOut: () => viewer.zoomOut(),
            fitWidth: () => viewer.fitWidth(),
            fitPage: () => viewer.fitPage(),
            previous: () => viewer.prevPage(),
            next: () => viewer.nextPage(),
          };
          setPosition({ label: "Página", current: viewer.currentPage + 1, total: viewer.pageCount });
          setScale(viewer.getScale());
        } else if (loaded.info.format === "pptx") {
          const { PptxViewer } = await import("@silurus/ooxml/pptx");
          if (cancelled) return;
          const viewer = new PptxViewer(element as HTMLCanvasElement, {
            fonts: [],
            enableTextSelection: true,
            enableHyperlinks: false,
            onSlideChange: (index, total) => {
              if (!cancelled) setPosition({ label: "Diapositiva", current: index + 1, total });
            },
            onScaleChange: (value) => {
              if (!cancelled) setScale(value);
            },
            onError: (viewerError) => {
              if (!cancelled) {
                setError(officeErrorMessage(viewerError));
                setLoading(false);
              }
            },
          });
          destroy = () => viewer.destroy();
          await viewer.load(loaded.bytes);
          if (cancelled) return;
          await viewer.fitPage();
          if (cancelled) return;
          refit = () => viewer.fitPage();
          controls = {
            destroy: () => viewer.destroy(),
            zoomIn: () => viewer.zoomIn(),
            zoomOut: () => viewer.zoomOut(),
            fitWidth: () => viewer.fitWidth(),
            fitPage: () => viewer.fitPage(),
            previous: () => viewer.prevSlide(),
            next: () => viewer.nextSlide(),
          };
          setPosition({ label: "Diapositiva", current: viewer.slideIndex + 1, total: viewer.slideCount });
          setScale(viewer.getScale());
        } else {
          const { XlsxViewer } = await import("@silurus/ooxml/xlsx");
          if (cancelled) return;
          const viewer = new XlsxViewer(element as HTMLElement, {
            fonts: [],
            showZoomSlider: false,
            enableHyperlinks: false,
            onSheetChange: (index, total) => {
              if (!cancelled) setPosition({ label: "Hoja", current: index + 1, total });
            },
            onScaleChange: (value) => {
              if (!cancelled) setScale(value);
            },
            onError: (viewerError) => {
              if (!cancelled) {
                setError(officeErrorMessage(viewerError));
                setLoading(false);
              }
            },
          });
          destroy = () => viewer.destroy();
          await viewer.load(loaded.bytes);
          if (cancelled) return;
          controls = {
            destroy: () => viewer.destroy(),
            zoomIn: () => viewer.zoomIn(),
            zoomOut: () => viewer.zoomOut(),
            fitWidth: () => viewer.fitWidth(),
            fitPage: () => viewer.fitPage(),
            previous: () => viewer.prevSheet(),
            next: () => viewer.nextSheet(),
          };
          setPosition({ label: "Hoja", current: viewer.sheetIndex + 1, total: viewer.sheetCount });
          setScale(viewer.getScale());
        }

        if (cancelled) {
          controls.destroy();
          return;
        }
        controlsRef.current = controls;
        if (refit) {
          resizeObserver = new ResizeObserver(() => {
            if (cancelled) return;
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => {
              if (!cancelled) void refit?.();
            });
          });
          resizeObserver.observe(host);
        }
        setLoading(false);
      } catch (viewerError) {
        if (cancelled) return;
        setLoading(false);
        setError(officeErrorMessage(viewerError));
        setLoaded(null);
      }
    };

    void init();

    return () => {
      cancelled = true;
      controlsRef.current = null;
      resizeObserver?.disconnect();
      cancelAnimationFrame(resizeFrame);
      destroy?.();
      host.replaceChildren();
    };
  }, [loaded]);

  const selectedFormat = loaded?.info.format;
  const canPrevious = Boolean(position && position.current > 1 && !loading);
  const canNext = Boolean(position && position.current < position.total && !loading);
  const canUseViewer = Boolean(loaded && !loading);
  const previousLabel = position?.label === "Diapositiva"
    ? "Diapositiva anterior"
    : position?.label === "Hoja"
      ? "Hoja anterior"
      : "Página anterior";
  const nextLabel = position?.label === "Diapositiva"
    ? "Diapositiva siguiente"
    : position?.label === "Hoja"
      ? "Hoja siguiente"
      : "Página siguiente";

  /**
   * Abre el selector nativo de archivos.
   */
  function openPicker() {
    inputRef.current?.click();
  }

  /**
   * Valida el archivo y lo carga en memoria.
   * @param file - Archivo elegido por la persona.
   */
  async function openFile(file: File | undefined) {
    if (!file) return;
    const validation = validateOfficeFile(file);
    if ("error" in validation) {
      setError(validation.error);
      return;
    }

    setError(null);
    setLoading(true);
    setPosition(null);
    setScale(1);
    setLoaded(null);
    try {
      const bytes = await file.arrayBuffer();
      loadIdRef.current += 1;
      setLoaded({ info: validation.file, bytes, id: loadIdRef.current });
    } catch {
      setLoading(false);
      setError("No se pudo leer el archivo. Inténtalo de nuevo.");
    }
  }

  /**
   * Cierra el documento actual y libera el visor.
   */
  function closeFile() {
    setLoaded(null);
    setError(null);
    setPosition(null);
    setScale(1);
  }

  /**
   * Ejecuta una acción del visor si está disponible.
   * @param action - Acción del controlador activo.
   */
  function runViewer(action: (controls: ViewerControls) => void | Promise<void>) {
    const controls = controlsRef.current;
    if (controls) void action(controls);
  }

  /**
   * Atajos del visor cuando el foco está en el área del documento.
   * @param event - Tecla pulsada.
   */
  function handleViewerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!loaded || loading || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      runViewer((controls) => controls.zoomIn());
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      runViewer((controls) => controls.zoomOut());
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      runViewer((controls) => controls.fitPage());
      return;
    }
    if (event.key === "1") {
      event.preventDefault();
      runViewer((controls) => controls.fitWidth());
      return;
    }
    if (selectedFormat === "xlsx") return;
    if ((event.key === "ArrowLeft" || event.key === "PageUp") && canPrevious) {
      event.preventDefault();
      runViewer((controls) => controls.previous?.() ?? undefined);
    } else if ((event.key === "ArrowRight" || event.key === "PageDown") && canNext) {
      event.preventDefault();
      runViewer((controls) => controls.next?.() ?? undefined);
    }
  }

  const fileActions = loaded ? (
    <div className="visor-office-file">
      <span className={`visor-office-file-icon is-${selectedFormat}`}>
        <OfficeFormatIcon format={selectedFormat ?? "docx"} />
      </span>
      <span className="visor-office-file-copy">
        <strong title={loaded.info.name}>{loaded.info.name}</strong>
        <small>{officeFormatLabel(loaded.info.format)} · {formatFileSize(loaded.info.size)}</small>
      </span>
    </div>
  ) : (
    <span className="visor-office-empty-label">Ningún archivo abierto</span>
  );

  return (
    <div className="visor-office-app">
      <header className="visor-office-header">
        <div className="visor-office-heading">
          <span className="visor-office-mark" aria-hidden>
            <Files size={18} strokeWidth={2} />
          </span>
          <span>
            <strong>Visor Office</strong>
            <small>Documentos en solo lectura</small>
          </span>
        </div>
        {fileActions}
        <div className="visor-office-header-actions">
          <span className="visor-office-readonly">Solo lectura</span>
          <button type="button" className="visor-office-open" onClick={openPicker} aria-label="Abrir archivo">
            <FolderOpen size={15} aria-hidden />
            <span>Abrir</span>
          </button>
        </div>
      </header>

      <input
        ref={inputRef}
        className="visor-office-input"
        type="file"
        accept={OFFICE_FILE_ACCEPT}
        aria-label="Elegir archivo de Office"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          void openFile(file);
        }}
      />

      <p id={noteId} className="visor-office-sr-only">
        El contenido se muestra en un lienzo de solo lectura. Usa los botones o, con el foco en el área del documento,
        las flechas para navegar, + y − para ampliar, 1 para ajustar al ancho y 0 para ajustar a la ventana.
        La lectura automática del lienzo puede ser limitada.
      </p>

      <div className="visor-office-toolbar" role="toolbar" aria-label="Controles del documento">
        <div className="visor-office-tool-group">
          <button type="button" className="visor-office-tool" onClick={openPicker} aria-label="Abrir archivo" title="Abrir archivo">
            <FolderOpen size={15} aria-hidden />
          </button>
          {loaded ? (
            <button type="button" className="visor-office-tool" onClick={closeFile} aria-label="Cerrar archivo" title="Cerrar archivo">
              <X size={15} aria-hidden />
            </button>
          ) : null}
        </div>

        {loaded ? (
          <div className="visor-office-tool-group">
            <button
              type="button"
              className="visor-office-tool"
              disabled={!canPrevious}
              onClick={() => runViewer((controls) => controls.previous?.() ?? undefined)}
              aria-label={previousLabel}
              title={previousLabel}
            >
              <ChevronLeft size={15} aria-hidden />
            </button>
            <span className="visor-office-position" role="status">
              {position ? `${position.label} ${position.current} de ${position.total}` : "Preparando…"}
            </span>
            <button
              type="button"
              className="visor-office-tool"
              disabled={!canNext}
              onClick={() => runViewer((controls) => controls.next?.() ?? undefined)}
              aria-label={nextLabel}
              title={nextLabel}
            >
              <ChevronRight size={15} aria-hidden />
            </button>
          </div>
        ) : null}

        <div className="visor-office-tool-group">
          <button
            type="button"
            className="visor-office-tool"
            disabled={!canUseViewer}
            onClick={() => runViewer((controls) => controls.zoomOut())}
            aria-label="Alejar"
            title="Alejar"
          >
            <ZoomOut size={15} aria-hidden />
          </button>
          <span className="visor-office-scale" aria-live="polite">{Math.round(scale * 100)} %</span>
          <button
            type="button"
            className="visor-office-tool"
            disabled={!canUseViewer}
            onClick={() => runViewer((controls) => controls.zoomIn())}
            aria-label="Acercar"
            title="Acercar"
          >
            <ZoomIn size={15} aria-hidden />
          </button>
          <button
            type="button"
            className="visor-office-tool"
            disabled={!canUseViewer}
            onClick={() => runViewer((controls) => controls.fitWidth())}
            aria-label="Ajustar al ancho"
            title="Ajustar al ancho"
          >
            <ArrowLeftRight size={15} aria-hidden />
          </button>
          <button
            type="button"
            className="visor-office-tool"
            disabled={!canUseViewer}
            onClick={() => runViewer((controls) => controls.fitPage())}
            aria-label="Ajustar a la ventana"
            title="Ajustar a la ventana"
          >
            <Maximize2 size={15} aria-hidden />
          </button>
        </div>
      </div>

      {error ? (
        <div className="visor-office-error" role="alert">
          <span>{error}</span>
          <button type="button" className="visor-office-error-action" onClick={openPicker}>
            <FolderOpen size={14} aria-hidden />
            Elegir otro archivo
          </button>
          <button type="button" className="visor-office-error-close" onClick={() => setError(null)} aria-label="Descartar aviso" title="Descartar aviso">
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : null}

      <section
        className={`visor-office-stage${selectedFormat === "xlsx" ? " is-spreadsheet" : ""}`}
        aria-label="Visor de documentos"
        aria-busy={loading}
      >
        {loaded ? (
          <div
            ref={hostRef}
            className={`visor-office-host${selectedFormat === "xlsx" ? " is-spreadsheet" : ""}`}
            role="group"
            aria-label={`Documento ${loaded.info.name}`}
            aria-describedby={noteId}
            aria-busy={loading}
            tabIndex={loading ? -1 : 0}
            onKeyDown={handleViewerKeyDown}
          />
        ) : null}

        {loading ? (
          <div className="visor-office-loading" role="status">
            <span className="visor-office-spinner" aria-hidden />
            <span>Abriendo documento…</span>
          </div>
        ) : null}

        {!loaded && !loading ? (
          <div className="visor-office-empty">
            <span className="visor-office-empty-mark" aria-hidden>
              <FileUp size={28} strokeWidth={1.8} />
            </span>
            <h1>Abre un documento de Office</h1>
            <p>
              Elige un archivo <strong>.docx</strong>, <strong>.xlsx</strong> o <strong>.pptx</strong>.
              Se abre en este navegador: no se sube, no se modifica y no se guarda en el proyecto.
            </p>
            <button type="button" className="visor-office-primary" onClick={openPicker}>
              <FolderOpen size={16} aria-hidden />
              Elegir archivo
            </button>
            <span className="visor-office-formats">
              <span><FileText size={14} aria-hidden /> Word</span>
              <span><FileSpreadsheet size={14} aria-hidden /> Excel</span>
              <span><Presentation size={14} aria-hidden /> PowerPoint</span>
            </span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
