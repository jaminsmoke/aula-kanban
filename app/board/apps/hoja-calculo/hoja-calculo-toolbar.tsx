"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  Copy,
  Download,
  Eraser,
  FolderOpen,
  Italic,
  RotateCcw,
  Rows3,
  Save,
  Sheet,
} from "lucide-react";

type HojaCalculoToolbarProps = {
  ready: boolean;
  readOnly: boolean;
  saving: boolean;
  loading: boolean;
  hasSelection: boolean;
  onAddRow: () => void;
  onAddColumn: () => void;
  onApplyStyle: (property: string, value: string, message: string) => void;
  onClearFormat: () => void;
  onCopySelection: () => void;
  onExportCsv: () => void;
  onReload: () => void;
  onSave: () => void;
  onReset: () => void;
};

/**
 * Cabecera y acciones de la hoja de cálculo.
 * @param props - Estado de la rejilla y acciones.
 * @returns La barra de herramientas.
 */
export function HojaCalculoToolbar({
  ready,
  readOnly,
  saving,
  loading,
  hasSelection,
  onAddRow,
  onAddColumn,
  onApplyStyle,
  onClearFormat,
  onCopySelection,
  onExportCsv,
  onReload,
  onSave,
  onReset,
}: HojaCalculoToolbarProps) {
  return (
    <header className="hoja-calculo-toolbar ui-toolbar">
      <div className="hoja-calculo-heading">
        <span className="hoja-calculo-mark" aria-hidden>
          <Sheet size={18} strokeWidth={2} />
        </span>
        <span>
          <strong>Hoja de cálculo</strong>
          <small>Celdas y formato</small>
        </span>
      </div>
      <div className="hoja-calculo-actions" role="group" aria-label="Herramientas de la hoja">
        <button type="button" onClick={onAddRow} disabled={!ready || readOnly} aria-label="Añadir fila">
          <Rows3 size={15} aria-hidden />
          <span>Fila</span>
        </button>
        <button type="button" onClick={onAddColumn} disabled={!ready || readOnly} aria-label="Añadir columna">
          <Columns3 size={15} aria-hidden />
          <span>Columna</span>
        </button>
        <button
          type="button"
          onClick={() => onApplyStyle("font-weight", "bold", "Negrita aplicada.")}
          disabled={!ready || readOnly}
          aria-label="Negrita"
        >
          <Bold size={15} aria-hidden />
          <span>Negrita</span>
        </button>
        <button
          type="button"
          onClick={() => onApplyStyle("font-style", "italic", "Cursiva aplicada.")}
          disabled={!ready || readOnly}
          aria-label="Cursiva"
        >
          <Italic size={15} aria-hidden />
          <span>Cursiva</span>
        </button>
        <button
          type="button"
          onClick={() => onApplyStyle("text-align", "left", "Alineación izquierda.")}
          disabled={!ready || readOnly}
          aria-label="Alinear a la izquierda"
        >
          <AlignLeft size={15} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onApplyStyle("text-align", "center", "Alineación centrada.")}
          disabled={!ready || readOnly}
          aria-label="Centrar"
        >
          <AlignCenter size={15} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onApplyStyle("text-align", "right", "Alineación derecha.")}
          disabled={!ready || readOnly}
          aria-label="Alinear a la derecha"
        >
          <AlignRight size={15} aria-hidden />
        </button>
        <button type="button" onClick={onClearFormat} disabled={!ready || readOnly} aria-label="Limpiar formato">
          <Eraser size={15} aria-hidden />
          <span>Limpiar</span>
        </button>
        <button type="button" onClick={onExportCsv} disabled={!ready} aria-label="Exportar CSV">
          <Download size={15} aria-hidden />
          <span>CSV</span>
        </button>
        <button
          type="button"
          onClick={onCopySelection}
          disabled={!ready || !hasSelection}
          aria-label="Copiar tabla"
        >
          <Copy size={15} aria-hidden />
          <span>Copiar</span>
        </button>
        <button type="button" onClick={onReload} disabled={loading} aria-label="Cargar hoja">
          <FolderOpen size={15} aria-hidden />
          <span>Cargar</span>
        </button>
        <button type="button" onClick={onSave} disabled={!ready || readOnly || saving || loading} aria-label="Guardar hoja">
          <Save size={15} aria-hidden />
          <span>{saving ? "Guardando…" : "Guardar"}</span>
        </button>
        <button type="button" onClick={onReset} disabled={!ready || readOnly} aria-label="Reiniciar hoja">
          <RotateCcw size={15} aria-hidden />
          <span>Reiniciar</span>
        </button>
      </div>
    </header>
  );
}
