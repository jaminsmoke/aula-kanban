"use client";

import { CalendarClock, FolderOpen, RotateCcw, Save, ZoomIn, ZoomOut } from "lucide-react";

type TimelineToolbarProps = {
  initError: string | null;
  loading: boolean;
  readOnly: boolean;
  saving: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReload: () => void;
  onSave: () => void;
};

/**
 * Cabecera con los controles generales de la línea temporal.
 * @param props - Estado y acciones del lienzo.
 * @returns La barra superior.
 */
export function TimelineToolbar({
  initError,
  loading,
  readOnly,
  saving,
  onZoomIn,
  onZoomOut,
  onFit,
  onReload,
  onSave,
}: TimelineToolbarProps) {
  return (
    <header className="timeline-toolbar ui-toolbar">
      <div className="timeline-heading">
        <span className="timeline-mark" aria-hidden>
          <CalendarClock size={18} strokeWidth={2} />
        </span>
        <span>
          <strong>Líneas de tiempo</strong>
          <small>Eventos y épocas</small>
        </span>
      </div>
      <div className="timeline-actions" role="group" aria-label="Controles de la línea temporal">
        <button type="button" onClick={onZoomIn} aria-label="Acercar" disabled={Boolean(initError)}>
          <ZoomIn size={15} aria-hidden />
          <span>Acercar</span>
        </button>
        <button type="button" onClick={onZoomOut} aria-label="Alejar" disabled={Boolean(initError)}>
          <ZoomOut size={15} aria-hidden />
          <span>Alejar</span>
        </button>
        <button type="button" onClick={onFit} aria-label="Recentrar vista" disabled={Boolean(initError)}>
          <RotateCcw size={15} aria-hidden />
          <span>Recentrar</span>
        </button>
        <button type="button" onClick={onReload} disabled={loading}>
          <FolderOpen size={15} aria-hidden />
          <span>Cargar</span>
        </button>
        <button type="button" onClick={onSave} disabled={readOnly || saving || loading}>
          <Save size={15} aria-hidden />
          <span>{saving ? "Guardando…" : "Guardar"}</span>
        </button>
      </div>
    </header>
  );
}
