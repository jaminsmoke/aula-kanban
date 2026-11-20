"use client";

import { Layers3, Save } from "lucide-react";

type TarjetasToolbarProps = {
  readOnly: boolean;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  onSave: () => void;
};

/**
 * Cabecera con el estado de guardado de Tarjetas.
 * @param props - Estado y acción de guardado.
 * @returns La barra superior.
 */
export function TarjetasToolbar({ readOnly, dirty, saving, loading, onSave }: TarjetasToolbarProps) {
  return (
    <header className="tarjetas-toolbar">
      <div className="tarjetas-heading">
        <span className="tarjetas-mark" aria-hidden><Layers3 size={18} strokeWidth={2} /></span>
        <span>
          <strong>Tarjetas de repaso</strong>
          <small>Mazos compartidos del proyecto</small>
        </span>
      </div>
      <div className="tarjetas-actions">
        {readOnly ? <span className="tarjetas-readonly">Solo lectura</span> : null}
        {dirty ? <span className="tarjetas-unsaved">Sin guardar</span> : null}
        <button type="button" onClick={onSave} disabled={readOnly || !dirty || saving || loading}>
          <Save size={15} aria-hidden /> {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </header>
  );
}
