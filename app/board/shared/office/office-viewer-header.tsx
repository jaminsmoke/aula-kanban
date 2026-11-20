"use client";

import { FileSpreadsheet, FileText, Files, FolderOpen, Presentation } from "lucide-react";
import {
  formatFileSize,
  officeFormatLabel,
  type OfficeFormat,
} from "./office-model";
import type { LoadedOfficeFile } from "./office-viewer-types";

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

type OfficeViewerHeaderProps = {
  embedded: boolean;
  loaded: LoadedOfficeFile | null;
  selectedFormat: OfficeFormat | undefined;
  onOpen: () => void;
};

/**
 * Cabecera del visor con la ficha del archivo y el botón de apertura.
 * @param props - Estado del archivo y acción de apertura.
 * @returns La cabecera.
 */
export function OfficeViewerHeader({ embedded, loaded, selectedFormat, onOpen }: OfficeViewerHeaderProps) {
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
        {!embedded ? (
          <button type="button" className="visor-office-open" onClick={onOpen} aria-label="Abrir archivo">
            <FolderOpen size={15} aria-hidden />
            <span>Abrir</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
