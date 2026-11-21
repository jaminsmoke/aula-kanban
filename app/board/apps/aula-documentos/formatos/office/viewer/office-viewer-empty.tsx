"use client";

import { FileSpreadsheet, FileText, FileUp, FolderOpen, Presentation } from "lucide-react";

type OfficeViewerEmptyProps = {
  onOpen: () => void;
};

/**
 * Estado vacío con la explicación de formatos y la acción de apertura.
 * @param props - Acción de apertura.
 * @returns El estado vacío.
 */
export function OfficeViewerEmpty({ onOpen }: OfficeViewerEmptyProps) {
  return (
    <div className="visor-office-empty">
      <span className="visor-office-empty-mark" aria-hidden>
        <FileUp size={28} strokeWidth={1.8} />
      </span>
      <h1>Abre un documento de Office</h1>
      <p>
        Elige un archivo <strong>.docx</strong>, <strong>.xlsx</strong> o <strong>.pptx</strong>.
        Se abre en este navegador: no se sube, no se modifica y no se guarda en el proyecto.
      </p>
      <button type="button" className="visor-office-primary" onClick={onOpen}>
        <FolderOpen size={16} aria-hidden />
        Elegir archivo
      </button>
      <span className="visor-office-formats">
        <span><FileText size={14} aria-hidden /> Word</span>
        <span><FileSpreadsheet size={14} aria-hidden /> Excel</span>
        <span><Presentation size={14} aria-hidden /> PowerPoint</span>
      </span>
    </div>
  );
}
