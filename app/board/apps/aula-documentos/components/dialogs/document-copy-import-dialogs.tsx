import { lazy, Suspense, type ChangeEvent } from "react";
import { Archive, Download, Eye, Loader2, NotebookPen, Trash2, Upload, X } from "lucide-react";
import { IMPORT_LABELS } from "../../hooks/use-aula-import";
import { useAulaDocumentosView } from "../../aula-documentos-context";
import { contentText } from "../../../../../../lib/domain/aula-documentos/text";

const OfficeViewer = lazy(() => import("../../../../shared/office/office-viewer"));

/**
 * Diálogos de cierre, copias portables, importación y visor Office.
 * @returns El componente de la vista.
 */
export function DocumentCopyImportDialogs() {
  const {
    closePromptOpen,
    setClosePromptOpen,
    closePromptRef,
    saveFailed,
    closeWithoutSaving,
    saveAndClose,
    saving,
    copiesOpen,
    closeCopies,
    copiesRef,
    copyNotice,
    copiesError,
    readOnly,
    saveCurrentCopy,
    copySaving,
    loading,
    invalidDocument,
    downloadLocalCopy,
    copiesLoading,
    copies,
    setCopyDeleteId,
    copyDeleteId,
    removeStoredCopy,
    downloadStoredCopy,
    copyImportOpen,
    copyImport,
    closeCopyImport,
    copyImportRef,
    copyImportBusy,
    copyImportError,
    copyImportConfirm,
    setCopyImportConfirm,
    applyCopyImport,
    importOpen,
    officePreviewOpen,
    closeImport,
    importRef,
    importPreview,
    importSourceDate,
    importExcerpt,
    setImportPreview,
    setImportError,
    setImportConfirm,
    importConfirm,
    applyImport,
    importOfficeSource,
    setOfficePreviewTitle,
    setOfficePreviewOpen,
    importLoading,
    importError,
    importMarkdown,
    importOffice,
    officeOpenSource,
    officePreviewTitle,
    officePreviewRef,
    closeOfficePreview,
  } = useAulaDocumentosView();

  return (
    <>
      {closePromptOpen ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setClosePromptOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setClosePromptOpen(false);
          }}
        >
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-close-title"
            ref={closePromptRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-close-title">Cerrar Aula Documentos</h2>
              <button
                type="button"
                className="aula-documentos-modal-close"
                onClick={() => setClosePromptOpen(false)}
                aria-label="Cancelar cierre"
                autoFocus
              >
                <X size={16} aria-hidden />
              </button>
            </header>
            <div className="aula-documentos-import-menu">
              <p className="aula-documentos-import-intro">
                Hay cambios sin guardar. Puedes guardarlos antes de cerrar o descartarlos.
              </p>
              {saveFailed ? (
                <p className="aula-documentos-import-error" role="alert">
                  No se pudo guardar el documento. Revisa la conexión e inténtalo de nuevo.
                </p>
              ) : null}
              <div className="aula-documentos-import-actions">
                <button
                  type="button"
                  className="aula-documentos-import-secondary"
                  onClick={() => setClosePromptOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="aula-documentos-import-secondary"
                  onClick={closeWithoutSaving}
                >
                  Cerrar sin guardar
                </button>
                <button
                  type="button"
                  className="aula-documentos-import-primary"
                  onClick={() => { void saveAndClose(); }}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Guardar y cerrar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {copiesOpen ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCopies();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeCopies();
          }}
        >
          <section
            className="aula-documentos-modal aula-documentos-copies-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-copies-title"
            ref={copiesRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-copies-title">Copias portables</h2>
              <button type="button" className="aula-documentos-modal-close" onClick={closeCopies} aria-label="Cerrar copias portables" autoFocus>
                <X size={16} aria-hidden />
              </button>
            </header>
            <div className="aula-documentos-copy-body">
              <p className="aula-documentos-import-intro">
                Guarda una copia completa en el proyecto o descárgala en tu equipo. Las copias guardadas no sustituyen al autosave.
              </p>
              {copyNotice ? <p className="aula-documentos-import-status" role="status">{copyNotice}</p> : null}
              {copiesError ? <p className="aula-documentos-import-error" role="alert">{copiesError}</p> : null}
              <div className="aula-documentos-copy-actions">
                {!readOnly ? (
                  <button type="button" className="aula-documentos-import-primary" onClick={() => { void saveCurrentCopy(); }} disabled={copySaving || loading || Boolean(invalidDocument)}>
                    {copySaving ? <Loader2 size={14} className="aula-documentos-spin" aria-hidden /> : <Archive size={14} aria-hidden />}
                    Guardar en el proyecto
                  </button>
                ) : null}
                <button type="button" className="aula-documentos-import-secondary" onClick={() => { void downloadLocalCopy(); }} disabled={loading || Boolean(invalidDocument)}>
                  <Download size={14} aria-hidden />
                  Descargar copia local
                </button>
              </div>
              <h3 className="aula-documentos-copy-heading">Copias guardadas</h3>
              {copiesLoading ? (
                <p className="aula-documentos-import-meta">Cargando copias…</p>
              ) : copies.length === 0 ? (
                <p className="aula-documentos-import-intro">Todavía no hay copias guardadas en este proyecto.</p>
              ) : (
                <div className="aula-documentos-copy-list">
                  {copies.map((copy) => {
                    const confirming = copyDeleteId === copy.id;
                    return (
                      <article className="aula-documentos-copy-item" key={copy.id}>
                        <div className="aula-documentos-copy-info">
                          <strong>{copy.title || "Documento sin título"}</strong>
                          <p className="aula-documentos-import-meta">
                            {copy.dateLabel} · {copy.sizeLabel} · {copy.author}
                          </p>
                          <p className="aula-documentos-import-meta">
                            Formato v{copy.formatVersion} · esquema v{copy.schemaVersion}
                          </p>
                        </div>
                        <div className="aula-documentos-copy-item-actions">
                          {confirming ? (
                            <>
                              <button type="button" className="aula-documentos-import-secondary" onClick={() => setCopyDeleteId(null)}>
                                Cancelar
                              </button>
                              <button type="button" className="aula-documentos-import-danger" onClick={() => { void removeStoredCopy(copy); }}>
                                <Trash2 size={14} aria-hidden />
                                Confirmar borrado
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="aula-documentos-import-secondary" onClick={() => { void downloadStoredCopy(copy); }}>
                                <Download size={14} aria-hidden />
                                Descargar
                              </button>
                              {!readOnly ? (
                                <button type="button" className="aula-documentos-import-danger" onClick={() => setCopyDeleteId(copy.id)}>
                                  <Trash2 size={14} aria-hidden />
                                  Borrar
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              <div className="aula-documentos-import-actions">
                <button type="button" className="aula-documentos-import-secondary" onClick={closeCopies}>
                  Cerrar
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {copyImportOpen && copyImport ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCopyImport();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeCopyImport();
          }}
        >
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-copy-import-title"
            ref={copyImportRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-copy-import-title">Importar copia portable</h2>
              <button type="button" className="aula-documentos-modal-close" onClick={closeCopyImport} aria-label="Cerrar importación de copia" autoFocus disabled={copyImportBusy}>
                <X size={16} aria-hidden />
              </button>
            </header>
            <div className="aula-documentos-import-preview">
              <p className="aula-documentos-import-kicker">{copyImport.fileName}</p>
              <h3>{copyImport.document.title || "Documento sin título"}</h3>
              <p className="aula-documentos-import-meta">
                {copyImport.stats.textLength} caracteres · {copyImport.stats.images === 1 ? "1 imagen" : `${copyImport.stats.images} imágenes`} · {copyImport.stats.mermaidBlocks === 1 ? "1 diagrama" : `${copyImport.stats.mermaidBlocks} diagramas`}
              </p>
              <p className="aula-documentos-import-meta">
                Creada: {copyImport.createdAtLabel} · formato v{copyImport.manifest.formatVersion} · esquema v{copyImport.manifest.schemaVersion}
              </p>
              <p className="aula-documentos-import-excerpt">
                {contentText(copyImport.document.content) || "El documento no contiene texto."}
              </p>
              {copyImport.warnings.length ? (
                <ul className="aula-documentos-import-warnings">
                  {copyImport.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : null}
              {copyImportError ? <p className="aula-documentos-import-error" role="alert">{copyImportError}</p> : null}
              <p className="aula-documentos-import-warning">
                Se sustituirá el documento abierto. Se guardará una copia local de recuperación antes de aplicar.
              </p>
              <label className="aula-documentos-import-confirm">
                <input
                  type="checkbox"
                  checked={copyImportConfirm}
                  onChange={(event) => setCopyImportConfirm(event.target.checked)}
                  disabled={copyImportBusy}
                />
                Entiendo que se reemplaza el documento actual.
              </label>
              <div className="aula-documentos-import-actions">
                <button type="button" className="aula-documentos-import-secondary" onClick={closeCopyImport} disabled={copyImportBusy}>
                  Volver
                </button>
                <button type="button" className="aula-documentos-import-primary" onClick={() => { void applyCopyImport(); }} disabled={!copyImportConfirm || copyImportBusy}>
                  {copyImportBusy ? "Importando…" : "Importar y reemplazar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {importOpen && !officePreviewOpen ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeImport();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeImport();
          }}
        >
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-import-title"
            ref={importRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-import-title">Importar documento</h2>
              <button type="button" className="aula-documentos-modal-close" onClick={closeImport} aria-label="Cerrar importación" autoFocus>
                <X size={16} aria-hidden />
              </button>
            </header>

            {importPreview ? (
              <div className="aula-documentos-import-preview">
                <p className="aula-documentos-import-kicker">{IMPORT_LABELS[importPreview.source]}</p>
                <h3>{importPreview.document.title || "Documento sin título"}</h3>
                <p className="aula-documentos-import-meta">
                  {importPreview.stats.textLength} caracteres de texto · {importPreview.stats.mermaidBlocks === 1 ? "1 diagrama" : `${importPreview.stats.mermaidBlocks} diagramas`}
                  {importPreview.stats.slideBreaks ? ` · ${importPreview.stats.slideBreaks} ${importPreview.stats.slideBreaks === 1 ? "salto" : "saltos"} de diapositiva` : ""}
                </p>
                <p className="aula-documentos-import-meta">{importSourceDate}</p>
                <p className="aula-documentos-import-excerpt">
                  {importExcerpt || "El documento no contiene texto."}
                </p>
                {importPreview.warnings.length ? (
                  <ul className="aula-documentos-import-warnings">
                    {importPreview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                ) : null}
                <p className="aula-documentos-import-warning">
                  Se sustituirá el documento abierto. {importPreview.source === "office"
                    ? "El archivo de Office no se modifica."
                    : "El documento de la app original no se modifica."}
                </p>
                <label className="aula-documentos-import-confirm">
                  <input
                    type="checkbox"
                    checked={importConfirm}
                    onChange={(event) => setImportConfirm(event.target.checked)}
                  />
                  Entiendo que se reemplaza el documento actual.
                </label>
                <div className="aula-documentos-import-actions">
                  {importPreview.source === "office" && importOfficeSource ? (
                    <button
                      type="button"
                      className="aula-documentos-import-secondary"
                      onClick={() => {
                        setOfficePreviewTitle("Archivo original");
                        setOfficePreviewOpen(true);
                      }}
                    >
                      <Eye size={14} aria-hidden />
                      Ver original
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="aula-documentos-import-secondary"
                    onClick={() => {
                      setImportPreview(null);
                      setImportConfirm(false);
                      setImportError(null);
                    }}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="aula-documentos-import-primary"
                    disabled={!importConfirm}
                    onClick={applyImport}
                  >
                    Importar y reemplazar
                  </button>
                </div>
              </div>
            ) : (
              <div className="aula-documentos-import-menu">
                <p className="aula-documentos-import-intro">
                  Elige un archivo Markdown o un DOCX/PPTX. La vista previa no cambia el origen. Para recuperar datos de las
                  apps documentales anteriores, usa Importar &gt; Migrar apps antiguas.
                </p>
                <label className="aula-documentos-import-option" htmlFor="aula-documentos-office-file">
                  <Upload size={18} aria-hidden />
                  <span><strong>Documento de Office</strong><small>DOCX o PPTX con vista previa; XLSX se consulta en el visor</small></span>
                </label>
                <input
                  id="aula-documentos-office-file"
                  className="aula-documentos-file-input"
                  type="file"
                  accept=".docx,.pptx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void importOffice(file);
                  }}
                />
                <label className="aula-documentos-import-option" htmlFor="aula-documentos-markdown-file">
                  <NotebookPen size={18} aria-hidden />
                  <span><strong>Archivo Markdown</strong><small>Importa .md o .markdown con vista previa</small></span>
                </label>
                <input
                  id="aula-documentos-markdown-file"
                  className="aula-documentos-file-input"
                  type="file"
                  accept=".md,.markdown,text/markdown,text/plain"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void importMarkdown(file);
                  }}
                />
                {importLoading ? (
                  <p className="aula-documentos-import-status" role="status">
                    <Loader2 size={15} className="aula-documentos-spin" aria-hidden />
                    Leyendo {IMPORT_LABELS[importLoading as keyof typeof IMPORT_LABELS] ?? "documento"}…
                  </p>
                ) : null}
                {importError ? <p className="aula-documentos-import-error" role="alert">{importError}</p> : null}
                <div className="aula-documentos-import-actions">
                  <button type="button" className="aula-documentos-import-secondary" onClick={closeImport}>Cancelar</button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {officePreviewOpen && (importOfficeSource || officeOpenSource) ? (
        <div
          className="aula-documentos-modal-backdrop aula-documentos-office-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeOfficePreview();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeOfficePreview();
          }}
        >
          <section
            className="aula-documentos-modal aula-documentos-office-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-office-preview-title"
            ref={officePreviewRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-office-preview-title">{officePreviewTitle}</h2>
              <button
                type="button"
                className="aula-documentos-modal-close"
                onClick={closeOfficePreview}
                aria-label="Cerrar vista de Office"
                autoFocus
              >
                <X size={16} aria-hidden />
              </button>
            </header>
            <div className="aula-documentos-office-preview-body">
              <Suspense fallback={<p className="aula-documentos-loading">Preparando visor...</p>}>
                <OfficeViewer initialFile={importOfficeSource ?? officeOpenSource} embedded />
              </Suspense>
            </div>
          </section>
        </div>
      ) : null}

    </>
  );
}
