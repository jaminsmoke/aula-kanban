"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import {
  officeErrorMessage,
  validateOfficeFile,
} from "../../../../../../../lib/domain/aula-documentos/office-model";
import type { LoadedOfficeFile, ViewerControls, ViewerPosition } from "./office-viewer-types";

type UseOfficeViewerOptions = {
  initialFile?: File | null;
  inputRef: RefObject<HTMLInputElement | null>;
  hostRef: RefObject<HTMLDivElement | null>;
};

/**
 * Estado, selección de archivo y ciclo de vida del visor Office.
 * @param options - Archivo inicial y referencias del selector y el host.
 * @returns Estado, etiquetas y acciones del visor.
 */
export function useOfficeViewer({ initialFile = null, inputRef, hostRef }: UseOfficeViewerOptions) {
  const controlsRef = useRef<ViewerControls | null>(null);
  const loadIdRef = useRef(0);
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
    let element: HTMLElement = host;
    if (!isSpreadsheet) {
      const canvas = document.createElement("canvas");
      canvas.className = "visor-office-canvas";
      host.appendChild(canvas);
      element = canvas;
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
  }, [hostRef, loaded]);

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
  const openFile = useCallback(async (file: File | undefined) => {
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
  }, []);

  useEffect(() => {
    if (!initialFile) return;
    const timer = window.setTimeout(() => { void openFile(initialFile); }, 0);
    return () => window.clearTimeout(timer);
  }, [initialFile, openFile]);

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

  return {
    loaded,
    loading,
    error,
    position,
    scale,
    selectedFormat,
    canPrevious,
    canNext,
    canUseViewer,
    previousLabel,
    nextLabel,
    openPicker,
    openFile,
    closeFile,
    dismissError: () => setError(null),
    goPrevious: () => runViewer((controls) => controls.previous?.() ?? undefined),
    goNext: () => runViewer((controls) => controls.next?.() ?? undefined),
    zoomIn: () => runViewer((controls) => controls.zoomIn()),
    zoomOut: () => runViewer((controls) => controls.zoomOut()),
    fitWidth: () => runViewer((controls) => controls.fitWidth()),
    fitPage: () => runViewer((controls) => controls.fitPage()),
    handleViewerKeyDown,
  };
}
