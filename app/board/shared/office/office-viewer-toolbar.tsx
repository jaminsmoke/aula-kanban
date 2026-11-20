"use client";

import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { LoadedOfficeFile, ViewerPosition } from "./office-viewer-types";

type OfficeViewerToolbarProps = {
  embedded: boolean;
  loaded: LoadedOfficeFile | null;
  canPrevious: boolean;
  canNext: boolean;
  canUseViewer: boolean;
  position: ViewerPosition | null;
  scale: number;
  previousLabel: string;
  nextLabel: string;
  onOpen: () => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitWidth: () => void;
  onFitPage: () => void;
};

/**
 * Controles de archivo, navegación y zoom del visor.
 * @param props - Estado y acciones del visor.
 * @returns La barra de herramientas.
 */
export function OfficeViewerToolbar({
  embedded,
  loaded,
  canPrevious,
  canNext,
  canUseViewer,
  position,
  scale,
  previousLabel,
  nextLabel,
  onOpen,
  onClose,
  onPrevious,
  onNext,
  onZoomOut,
  onZoomIn,
  onFitWidth,
  onFitPage,
}: OfficeViewerToolbarProps) {
  return (
    <div className="visor-office-toolbar" role="toolbar" aria-label="Controles del documento">
      {!embedded ? (
        <div className="visor-office-tool-group">
          <button type="button" className="visor-office-tool" onClick={onOpen} aria-label="Abrir archivo" title="Abrir archivo">
            <FolderOpen size={15} aria-hidden />
          </button>
          {loaded ? (
            <button type="button" className="visor-office-tool" onClick={onClose} aria-label="Cerrar archivo" title="Cerrar archivo">
              <X size={15} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      {loaded ? (
        <div className="visor-office-tool-group">
          <button
            type="button"
            className="visor-office-tool"
            disabled={!canPrevious}
            onClick={onPrevious}
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
            onClick={onNext}
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
          onClick={onZoomOut}
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
          onClick={onZoomIn}
          aria-label="Acercar"
          title="Acercar"
        >
          <ZoomIn size={15} aria-hidden />
        </button>
        <button
          type="button"
          className="visor-office-tool"
          disabled={!canUseViewer}
          onClick={onFitWidth}
          aria-label="Ajustar al ancho"
          title="Ajustar al ancho"
        >
          <ArrowLeftRight size={15} aria-hidden />
        </button>
        <button
          type="button"
          className="visor-office-tool"
          disabled={!canUseViewer}
          onClick={onFitPage}
          aria-label="Ajustar a la ventana"
          title="Ajustar a la ventana"
        >
          <Maximize2 size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}
