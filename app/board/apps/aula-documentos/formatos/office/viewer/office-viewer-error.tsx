"use client";

import { FolderOpen, X } from "lucide-react";

type OfficeViewerErrorProps = {
  error: string;
  onOpen: () => void;
  onDismiss: () => void;
};

/**
 * Aviso de error del visor con acciones para elegir otro archivo o descartarlo.
 * @param props - Mensaje y acciones.
 * @returns El aviso de error.
 */
export function OfficeViewerError({ error, onOpen, onDismiss }: OfficeViewerErrorProps) {
  return (
    <div className="visor-office-error" role="alert">
      <span>{error}</span>
      <button type="button" className="visor-office-error-action" onClick={onOpen}>
        <FolderOpen size={14} aria-hidden />
        Elegir otro archivo
      </button>
      <button
        type="button"
        className="visor-office-error-close"
        onClick={onDismiss}
        aria-label="Descartar aviso"
        title="Descartar aviso"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
