"use client";

import { useId, useRef } from "react";
import { useDialogFocus } from "../shared/use-dialog-focus";
import "./unsaved-changes-dialog.css";

/** Propiedades del aviso de cierre con cambios pendientes. */
export type UnsavedChangesDialogProps = {
  open: boolean;
  busy?: boolean;
  notice?: string | null;
  onStay: () => void;
  onDiscard: () => void;
  onSave?: () => void;
};

/**
 * Aviso modal para cerrar una app con cambios sin guardar.
 * @param props - Acciones de permanecer, descartar o guardar y cerrar.
 * @returns El diálogo o `null` si no hay cambios pendientes.
 */
export default function UnsavedChangesDialog(props: UnsavedChangesDialogProps) {
  if (!props.open) return null;
  return <UnsavedChangesContent {...props} />;
}

/**
 * Contenido montado solo mientras el aviso está abierto.
 * @param props - Acciones de permanecer, descartar o guardar y cerrar.
 * @returns El diálogo modal.
 */
function UnsavedChangesContent({
  busy = false,
  notice = null,
  onStay,
  onDiscard,
  onSave,
}: UnsavedChangesDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useDialogFocus(true, onStay, dialogRef);

  return (
    <div className="draft-close-backdrop">
      <section
        className="draft-close-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        ref={dialogRef}
      >
        <header className="draft-close-head">
          <h2 id={titleId}>Cambios sin guardar</h2>
        </header>
        <div className="draft-close-body">
          <p id={descriptionId}>
            Hay cambios que todavía no se han guardado en el proyecto. Si cierras ahora, se perderán.
          </p>
          {notice ? <p className="draft-close-notice" role="alert">{notice}</p> : null}
          <div className="draft-close-actions">
            <button type="button" className="draft-close-secondary" onClick={onStay} disabled={busy}>
              Seguir editando
            </button>
            {onSave ? (
              <button type="button" className="draft-close-primary" onClick={onSave} disabled={busy}>
                {busy ? "Guardando…" : "Guardar y cerrar"}
              </button>
            ) : null}
            <button type="button" className="draft-close-danger" onClick={onDiscard} disabled={busy}>
              Cerrar sin guardar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
