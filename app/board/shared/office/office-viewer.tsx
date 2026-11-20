"use client";

import { useId, useRef } from "react";
import { OFFICE_FILE_ACCEPT } from "./office-model";
import { OfficeViewerEmpty } from "./office-viewer-empty";
import { OfficeViewerError } from "./office-viewer-error";
import { OfficeViewerHeader } from "./office-viewer-header";
import { OfficeViewerToolbar } from "./office-viewer-toolbar";
import { useOfficeViewer } from "./use-office-viewer";
import "./office-viewer.css";

type OfficeViewerProps = {
  initialFile?: File | null;
  embedded?: boolean;
  projectId?: string;
  role?: string;
  instanceUrl?: string;
};

/**
 * Visor Office: abre documentos locales de Office en solo lectura.
 * @param props - Archivo inicial opcional para la vista previa embebida.
 * @returns La ventana con selector, controles y visor.
 */
export default function VisorOfficeApp({ initialFile = null, embedded = false }: OfficeViewerProps = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const noteId = useId();
  const viewer = useOfficeViewer({ initialFile, inputRef, hostRef });
  const selectedFormat = viewer.selectedFormat;

  return (
    <div className="visor-office-app">
      <OfficeViewerHeader
        embedded={embedded}
        loaded={viewer.loaded}
        selectedFormat={selectedFormat}
        onOpen={viewer.openPicker}
      />

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
          void viewer.openFile(file);
        }}
      />

      <p id={noteId} className="visor-office-sr-only">
        El contenido se muestra en un lienzo de solo lectura. Usa los botones o, con el foco en el área del documento,
        las flechas para navegar, + y − para ampliar, 1 para ajustar al ancho y 0 para ajustar a la ventana.
        La lectura automática del lienzo puede ser limitada.
      </p>

      <OfficeViewerToolbar
        embedded={embedded}
        loaded={viewer.loaded}
        canPrevious={viewer.canPrevious}
        canNext={viewer.canNext}
        canUseViewer={viewer.canUseViewer}
        position={viewer.position}
        scale={viewer.scale}
        previousLabel={viewer.previousLabel}
        nextLabel={viewer.nextLabel}
        onOpen={viewer.openPicker}
        onClose={viewer.closeFile}
        onPrevious={viewer.goPrevious}
        onNext={viewer.goNext}
        onZoomOut={viewer.zoomOut}
        onZoomIn={viewer.zoomIn}
        onFitWidth={viewer.fitWidth}
        onFitPage={viewer.fitPage}
      />

      {viewer.error ? (
        <OfficeViewerError
          error={viewer.error}
          onOpen={viewer.openPicker}
          onDismiss={viewer.dismissError}
        />
      ) : null}

      <section
        className={`visor-office-stage${selectedFormat === "xlsx" ? " is-spreadsheet" : ""}`}
        aria-label="Visor de documentos"
        aria-busy={viewer.loading}
      >
        {viewer.loaded ? (
          <div
            ref={hostRef}
            className={`visor-office-host${selectedFormat === "xlsx" ? " is-spreadsheet" : ""}`}
            role="group"
            aria-label={`Documento ${viewer.loaded.info.name}`}
            aria-describedby={noteId}
            aria-busy={viewer.loading}
            tabIndex={viewer.loading ? -1 : 0}
            onKeyDown={viewer.handleViewerKeyDown}
          />
        ) : null}

        {viewer.loading ? (
          <div className="visor-office-loading" role="status">
            <span className="visor-office-spinner" aria-hidden />
            <span>Abriendo documento…</span>
          </div>
        ) : null}

        {!viewer.loaded && !viewer.loading ? <OfficeViewerEmpty onOpen={viewer.openPicker} /> : null}
      </section>
    </div>
  );
}
