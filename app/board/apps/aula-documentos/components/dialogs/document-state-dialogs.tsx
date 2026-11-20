import { Download, FileText, X } from "lucide-react";
import { AULA_DOCUMENT_TEMPLATES } from "../../../../../../lib/domain/aula-documentos/templates";
import { AULA_RECOVERY_REASON_LABELS } from "../../../../../../lib/domain/aula-documentos/recovery";
import { useAulaDocumentosView } from "../../aula-documentos-context";
import { formatSourceDate } from "../../utils/document-view";

/**
 * Diálogos de documento nuevo, documento inválido, conflicto y copias locales.
 * @returns El componente de la vista.
 */
export function DocumentStateDialogs() {
  const {
    newDocumentOpen,
    closeNewDocument,
    newDocumentRef,
    newDocumentPreview,
    newDocumentWordCount,
    newDocumentDiagramCount,
    newDocumentExcerpt,
    dirty,
    setNewDocumentPreview,
    applyNewDocument,
    selectNewDocumentTemplate,
    newDocumentError,
    invalidDocument,
    invalidDocumentRef,
    invalidResetConfirm,
    setInvalidResetConfirm,
    resetInvalidDocument,
    downloadInvalidDocument,
    loadSavedDocument,
    saveConflict,
    conflictRef,
    conflictNotice,
    setSaveConflict,
    setConflictNotice,
    saving,
    keepMineVersion,
    downloadConflictCopy,
    reloadServerVersion,
    recoveryOpen,
    closeRecoveryCopies,
    recoveryRef,
    recoveryNotice,
    recoveryCopies,
    recoveryRestoreId,
    setRecoveryRestoreId,
    setRecoveryNotice,
    restoreRecoveryCopy,
    downloadRecoveryCopy,
  } = useAulaDocumentosView();

  return (
    <>
      {newDocumentOpen ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeNewDocument();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeNewDocument();
          }}
        >
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-new-title"
            ref={newDocumentRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-new-title">Nuevo documento</h2>
              <button type="button" className="aula-documentos-modal-close" onClick={closeNewDocument} aria-label="Cerrar nuevo documento" autoFocus>
                <X size={16} aria-hidden />
              </button>
            </header>

            {newDocumentPreview ? (
              <div className="aula-documentos-import-preview">
                <p className="aula-documentos-import-kicker">{newDocumentPreview.template.name}</p>
                <h3>{newDocumentPreview.document.title}</h3>
                <p className="aula-documentos-import-meta">
                  {newDocumentWordCount === 1 ? "1 palabra" : `${newDocumentWordCount} palabras`}
                  {newDocumentDiagramCount === 1 ? " · 1 diagrama" : ` · ${newDocumentDiagramCount} diagramas`}
                </p>
                <p className="aula-documentos-import-excerpt">
                  {newDocumentExcerpt || "Documento vacío, listo para escribir."}
                </p>
                {dirty ? (
                  <p className="aula-documentos-import-warning">
                    Hay cambios sin guardar. Se sustituirán por el contenido de esta plantilla.
                  </p>
                ) : null}
                <div className="aula-documentos-import-actions">
                  <button
                    type="button"
                    className="aula-documentos-import-secondary"
                    onClick={() => setNewDocumentPreview(null)}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="aula-documentos-import-primary"
                    onClick={applyNewDocument}
                  >
                    {dirty ? "Reemplazar documento" : "Crear documento"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="aula-documentos-import-menu">
                <p className="aula-documentos-import-intro">
                  Elige una plantilla para empezar. El documento actual no cambia hasta que confirmes.
                </p>
                {dirty ? (
                  <p className="aula-documentos-import-warning">
                    Hay cambios sin guardar en el documento actual.
                  </p>
                ) : null}
                {AULA_DOCUMENT_TEMPLATES.map((template) => (
                  <button
                    type="button"
                    className="aula-documentos-import-option"
                    key={template.id}
                    onClick={() => selectNewDocumentTemplate(template)}
                  >
                    <FileText size={18} aria-hidden />
                    <span><strong>{template.name}</strong><small>{template.description}</small></span>
                  </button>
                ))}
                {newDocumentError ? <p className="aula-documentos-import-error" role="alert">{newDocumentError}</p> : null}
                <div className="aula-documentos-import-actions">
                  <button type="button" className="aula-documentos-import-secondary" onClick={closeNewDocument}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {invalidDocument ? (
        <div className="aula-documentos-modal-backdrop">
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-invalid-title"
            ref={invalidDocumentRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-invalid-title">Documento guardado inválido</h2>
            </header>
            <div className="aula-documentos-import-menu">
              <p className="aula-documentos-import-intro">{invalidDocument.message}</p>
              <p className="aula-documentos-import-intro">
                El documento original sigue guardado. Descárgalo antes de decidir si lo reintentas o empiezas de cero.
              </p>
              {invalidResetConfirm ? (
                <>
                  <p className="aula-documentos-import-warning">
                    Se sustituirá el documento inválido por uno vacío. Si no has descargado el JSON, perderás esta copia.
                  </p>
                  <div className="aula-documentos-import-actions">
                    <button
                      type="button"
                      className="aula-documentos-import-secondary"
                      onClick={() => setInvalidResetConfirm(false)}
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      className="aula-documentos-import-primary"
                      onClick={resetInvalidDocument}
                    >
                      Confirmar y empezar de cero
                    </button>
                  </div>
                </>
              ) : (
                <div className="aula-documentos-import-actions">
                  <button
                    type="button"
                    className="aula-documentos-import-secondary"
                    onClick={downloadInvalidDocument}
                  >
                    <Download size={14} aria-hidden />
                    Descargar JSON original
                  </button>
                  <button
                    type="button"
                    className="aula-documentos-import-secondary"
                    onClick={() => { void loadSavedDocument(); }}
                  >
                    Reintentar
                  </button>
                  <button
                    type="button"
                    className="aula-documentos-import-primary"
                    onClick={() => setInvalidResetConfirm(true)}
                  >
                    Empezar de cero
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {saveConflict ? (
        <div className="aula-documentos-modal-backdrop">
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-conflict-title"
            aria-describedby="aula-documentos-conflict-description"
            ref={conflictRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-conflict-title">Conflicto de versión</h2>
            </header>
            <div className="aula-documentos-import-menu">
              <p className="aula-documentos-import-intro" id="aula-documentos-conflict-description">
                El documento se guardó en otra pestaña o ventana después de tu última carga. Tus cambios siguen en el
                editor y todavía no se han sobrescrito.
              </p>
              <p className="aula-documentos-import-meta">
                {saveConflict.updatedAt === null
                  ? "No se pudo obtener la hora de la versión del servidor."
                  : `Versión del servidor: ${formatSourceDate(saveConflict.updatedAt) ?? "hora desconocida"}`}
              </p>
              <p className="aula-documentos-import-warning">
                El autosave y el guardado manual están detenidos hasta que resuelvas el conflicto.
              </p>
              {conflictNotice ? (
                <p className="aula-documentos-import-status" role="status">{conflictNotice}</p>
              ) : null}

              {saveConflict.keepConfirm ? (
                <>
                  <p className="aula-documentos-import-warning">
                    Se descargará una copia JSON de tu versión y después se sobrescribirá la versión del servidor.
                    Los cambios de la otra sesión se perderán.
                  </p>
                  <div className="aula-documentos-import-actions">
                    <button
                      type="button"
                      className="aula-documentos-import-secondary"
                      onClick={() => {
                        setSaveConflict((current) => current ? { ...current, keepConfirm: false } : current);
                        setConflictNotice(null);
                      }}
                      disabled={saving}
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      className="aula-documentos-import-primary"
                      onClick={() => { void keepMineVersion(); }}
                      disabled={saving}
                    >
                      {saving ? "Guardando…" : "Descargar copia y sobrescribir"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="aula-documentos-import-actions">
                  <button
                    type="button"
                    className="aula-documentos-import-secondary"
                    onClick={() => { downloadConflictCopy(); }}
                    disabled={saving}
                  >
                    <Download size={14} aria-hidden />
                    Descargar copia
                  </button>
                  <button
                    type="button"
                    className="aula-documentos-import-secondary"
                    onClick={() => { void reloadServerVersion(); }}
                    disabled={saving}
                  >
                    {saving ? "Recargando…" : "Recargar versión del servidor"}
                  </button>
                  <button
                    type="button"
                    className="aula-documentos-import-primary"
                    onClick={() => {
                      setSaveConflict((current) => current ? { ...current, keepConfirm: true } : current);
                      setConflictNotice(null);
                    }}
                    disabled={saving}
                  >
                    Conservar la mía
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {recoveryOpen ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRecoveryCopies();
          }}
        >
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-recovery-title"
            ref={recoveryRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-recovery-title">Copias locales</h2>
              <button
                type="button"
                className="aula-documentos-modal-close"
                onClick={closeRecoveryCopies}
                aria-label="Cerrar copias locales"
              >
                <X size={16} aria-hidden />
              </button>
            </header>
            <div className="aula-documentos-import-menu">
              <p className="aula-documentos-import-intro">
                Se guardan en este navegador antes de reemplazar el documento o resolver un conflicto.
                No se sincronizan con el servidor y se purgan las más antiguas.
              </p>
              {recoveryNotice ? (
                <p className="aula-documentos-import-status" role="status">{recoveryNotice}</p>
              ) : null}
              {recoveryCopies.length === 0 ? (
                <p className="aula-documentos-import-intro">Todavía no hay copias locales para este proyecto.</p>
              ) : (
                <div className="aula-documentos-recovery-list">
                  {recoveryCopies.map((copy) => {
                    const confirming = recoveryRestoreId === copy.id;
                    const createdLabel = formatSourceDate(copy.createdAt);
                    const versionLabel = formatSourceDate(copy.serverUpdatedAt);
                    return (
                      <article className="aula-documentos-recovery-item" key={copy.id}>
                        <div className="aula-documentos-recovery-head">
                          <strong>{copy.title || "Documento sin título"}</strong>
                          <span className="aula-documentos-import-meta">
                            {AULA_RECOVERY_REASON_LABELS[copy.reason]}
                          </span>
                        </div>
                        <p className="aula-documentos-import-meta">
                          {createdLabel ? `Guardada: ${createdLabel}` : "Fecha no disponible."}
                          {versionLabel ? ` · Versión del servidor: ${versionLabel}` : ""}
                        </p>
                        {confirming ? (
                          <>
                            <p className="aula-documentos-import-warning">
                              Se cargará en el editor, pero no se guardará en el servidor hasta que pulses
                              «Guardar documento».
                            </p>
                            <div className="aula-documentos-import-actions">
                              <button
                                type="button"
                                className="aula-documentos-import-secondary"
                                onClick={() => {
                                  setRecoveryRestoreId(null);
                                  setRecoveryNotice(null);
                                }}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="aula-documentos-import-primary"
                                onClick={() => { restoreRecoveryCopy(copy); }}
                              >
                                Confirmar restauración
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="aula-documentos-import-actions">
                            <button
                              type="button"
                              className="aula-documentos-import-secondary"
                              onClick={() => { downloadRecoveryCopy(copy); }}
                            >
                              <Download size={14} aria-hidden />
                              Descargar
                            </button>
                            <button
                              type="button"
                              className="aula-documentos-import-primary"
                              onClick={() => {
                                setRecoveryRestoreId(copy.id);
                                setRecoveryNotice(null);
                              }}
                            >
                              Restaurar
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
              <div className="aula-documentos-import-actions">
                <button type="button" className="aula-documentos-import-secondary" onClick={closeRecoveryCopies}>
                  Cerrar
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

    </>
  );
}
