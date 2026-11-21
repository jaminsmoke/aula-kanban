"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Save, X } from "lucide-react";
import type { AulaDocumentVersion } from "../../../../../lib/domain/aula-documentos/revision";
import { AULA_VERSION_NAME_MAX_LENGTH, AULA_VERSION_PAGE_SIZE } from "../../../../../lib/domain/aula-documentos/revision";
import { contentText } from "../../../../../lib/domain/aula-documentos/text";
import { formatDateTime } from "../../../shared/ui/date";
import { useAulaDocumentosView } from "../aula-documentos-context";

/**
 * Formatea el tamaño de un snapshot.
 * @param bytes - Caracteres serializados.
 * @returns Texto compacto.
 */
function sizeLabel(bytes: number): string {
  return bytes >= 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${bytes} B`;
}

/**
 * Panel lateral de historial y restauración de versiones.
 * @returns El panel o `null` si está cerrado.
 */
export function DocumentHistoryPanel() {
  const {
    historyOpen,
    versions,
    versionCount,
    versionsLoading,
    versionsError,
    versionPreview,
    versionPreviewLoading,
    closeHistory,
    createVersion,
    previewVersion,
    restoreVersion,
    clearVersionPreview,
  } = useAulaDocumentosView();
  const [name, setName] = useState("");
  const [page, setPage] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pageCount = Math.max(1, Math.ceil(versions.length / AULA_VERSION_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleVersions = versions.slice(
    currentPage * AULA_VERSION_PAGE_SIZE,
    (currentPage + 1) * AULA_VERSION_PAGE_SIZE,
  );

  useEffect(() => {
    if (historyOpen) closeRef.current?.focus();
  }, [historyOpen]);

  if (!historyOpen) return null;

  async function submitVersion() {
    if (await createVersion(name)) {
      setName("");
      setPage(0);
    }
  }

  function confirmRestore(version: AulaDocumentVersion) {
    if (!window.confirm(`¿Restaurar «${version.name}»? El documento actual se guardará antes como versión previa.`)) return;
    void restoreVersion(version);
  }

  return (
    <aside className="aula-documentos-history" aria-label="Historial de versiones">
      <header className="aula-documentos-history-head">
        <div>
          <h2>Historial</h2>
          <span>{versionCount} {versionCount === 1 ? "versión" : "versiones"}</span>
        </div>
        <button type="button" className="aula-documentos-history-close" onClick={closeHistory} aria-label="Cerrar historial" ref={closeRef}>
          <X size={15} aria-hidden />
        </button>
      </header>

      <form className="aula-documentos-version-form" onSubmit={(event) => { event.preventDefault(); void submitVersion(); }}>
        <label htmlFor="aula-documentos-version-name">Nueva versión</label>
        <input
          id="aula-documentos-version-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre opcional"
          maxLength={AULA_VERSION_NAME_MAX_LENGTH}
        />
        <button type="submit">
          <Save size={13} aria-hidden />
          Guardar versión
        </button>
      </form>

      {versionsLoading ? <p className="aula-documentos-history-message">Cargando historial…</p> : null}
      {versionsError ? <p className="aula-documentos-history-error" role="alert">{versionsError}</p> : null}
      {!versionsLoading && !versionsError && versions.length === 0 ? (
        <p className="aula-documentos-history-message">Todavía no hay versiones guardadas.</p>
      ) : null}

      {versionPreviewLoading ? <p className="aula-documentos-history-message">Abriendo versión…</p> : null}
      {versionPreview ? (
        <section className="aula-documentos-version-preview" aria-label="Vista previa de la versión">
          <header>
            <strong>{versionPreview.version.name}</strong>
            <button type="button" onClick={clearVersionPreview} aria-label="Cerrar vista previa de la versión"><X size={13} aria-hidden /></button>
          </header>
          <p>{versionPreview.document.title || "Documento sin título"}</p>
          <small>{contentText(versionPreview.document.content).replace(/\s+/g, " ").trim().slice(0, 700) || "Sin contenido de texto."}</small>
        </section>
      ) : null}

      <div className="aula-documentos-version-list">
        {visibleVersions.map((version) => (
          <article className="aula-documentos-version" key={version.id}>
            <div className="aula-documentos-version-title">
              <strong>{version.name}</strong>
              <span>{version.kind === "pre-restore" ? "Previa a restauración" : "Manual"}</span>
            </div>
            <p>{version.createdByName} · {formatDateTime(version.createdAt) ?? "Sin fecha"} · {sizeLabel(version.sizeBytes)}</p>
            <div className="aula-documentos-version-actions">
              <button type="button" onClick={() => { void previewVersion(version); }} disabled={versionPreviewLoading}>
                Ver
              </button>
              <button type="button" onClick={() => confirmRestore(version)}>
                <RotateCcw size={12} aria-hidden />
                Restaurar
              </button>
            </div>
          </article>
        ))}
      </div>
      {pageCount > 1 ? (
        <div className="aula-documentos-version-pagination">
          <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 0}>
            Anterior
          </button>
          <span>{currentPage + 1} / {pageCount}</span>
          <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1}>
            Siguiente
          </button>
        </div>
      ) : null}
    </aside>
  );
}
