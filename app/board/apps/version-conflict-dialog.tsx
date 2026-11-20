"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useDialogFocus } from "../shared/use-dialog-focus";
import { formatDateTime } from "../shared/ui/date";
import "./version-conflict-dialog.css";

/** Propiedades del diálogo compartido de conflicto de versión. */
export type VersionConflictDialogProps = {
  open: boolean;
  serverUpdatedAt: number | null;
  notice: string | null;
  busy: boolean;
  onDownload: () => void;
  onReload: () => void;
  onKeepMine: () => void;
};

/**
 * Diálogo para resolver un conflicto entre la copia local y la del servidor.
 * Mantiene el foco dentro y no se cierra con Escape: la app debe elegir una
 * salida para no perder cambios.
 * @param props - Estado del conflicto y acciones de resolución.
 * @returns El diálogo o `null` si no hay conflicto.
 */
export default function VersionConflictDialog(props: VersionConflictDialogProps) {
  if (!props.open) return null;
  return <ConflictDialogContent {...props} />;
}

/**
 * Contenido montado solo mientras el conflicto está abierto.
 * @param props - Estado del conflicto y acciones de resolución.
 * @returns El diálogo modal.
 */
function ConflictDialogContent({
  serverUpdatedAt,
  notice,
  busy,
  onDownload,
  onReload,
  onKeepMine,
}: VersionConflictDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const firstConfirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [keepConfirm, setKeepConfirm] = useState(false);
  useDialogFocus(true, () => {}, dialogRef);

  useEffect(() => {
    if (!keepConfirm) return;
    firstConfirmRef.current?.focus();
  }, [keepConfirm]);

  const serverLabel = formatDateTime(serverUpdatedAt);

  return (
    <div className="version-conflict-backdrop">
      <section
        className="version-conflict-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        ref={dialogRef}
      >
        <header className="version-conflict-head">
          <h2 id={titleId}>Conflicto de versión</h2>
        </header>
        <div className="version-conflict-body">
          <p id={descriptionId}>
            El borrador se guardó en otra pestaña o ventana después de tu última carga. Tus cambios siguen en el
            editor y todavía no se han sobrescrito.
          </p>
          <p className="version-conflict-meta">
            {serverLabel === null
              ? "No se pudo obtener la hora de la versión del servidor."
              : `Versión del servidor: ${serverLabel}`}
          </p>
          <p className="version-conflict-warning">
            El autosave y el guardado manual están detenidos hasta que resuelvas el conflicto.
          </p>
          {notice ? <p className="version-conflict-notice" role="status">{notice}</p> : null}

          {keepConfirm ? (
            <>
              <p className="version-conflict-warning">
                Se descargará una copia de tu versión y después se sobrescribirá la versión del servidor. Los
                cambios de la otra sesión se perderán.
              </p>
              <div className="version-conflict-actions">
                <button
                  ref={firstConfirmRef}
                  type="button"
                  className="version-conflict-secondary"
                  onClick={() => setKeepConfirm(false)}
                  disabled={busy}
                >
                  Volver
                </button>
                <button
                  type="button"
                  className="version-conflict-primary"
                  onClick={onKeepMine}
                  disabled={busy}
                >
                  {busy ? "Guardando…" : "Descargar copia y sobrescribir"}
                </button>
              </div>
            </>
          ) : (
            <div className="version-conflict-actions">
              <button
                type="button"
                className="version-conflict-secondary"
                onClick={onDownload}
                disabled={busy}
              >
                <Download size={14} aria-hidden />
                Descargar copia
              </button>
              <button
                type="button"
                className="version-conflict-secondary"
                onClick={onReload}
                disabled={busy}
              >
                {busy ? "Recargando…" : "Recargar versión del servidor"}
              </button>
              <button
                type="button"
                className="version-conflict-primary"
                onClick={() => setKeepConfirm(true)}
                disabled={busy}
              >
                Conservar la mía
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


