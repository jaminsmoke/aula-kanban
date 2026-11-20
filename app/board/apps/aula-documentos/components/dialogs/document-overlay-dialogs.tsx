import { lazy, Suspense } from "react";
import { X } from "lucide-react";
import { AULA_MIGRATION_SOURCE_LABELS } from "../../../../../../lib/domain/aula-documentos/migration";
import { useAulaDocumentosView } from "../../aula-documentos-context";
import { formatSourceDate } from "../../utils/document-view";

const PresentationView = lazy(() => import("../../../../shared/aula-documentos/presentation-view").then((module) => ({
  default: module.PresentationView,
})));

/**
 * Diálogos de migración, Markdown, vista previa y presentación.
 * @returns El componente de la vista.
 */
export function DocumentOverlayDialogs() {
  const {
    migrationOpen,
    setMigrationOpen,
    migrationStatus,
    migrationLoading,
    migrationError,
    migrationNotice,
    migrationRef,
    runMigration,
    dirty,
    readOnly,
    saving,
    markdownSourceOpen,
    setMarkdownSourceOpen,
    markdownSourceRef,
    markdownSourceDraft,
    setMarkdownSourceDraft,
    markdownSourceError,
    applyMarkdownSource,
    slidePreview,
    setSlidePreview,
    slidePreviewRef,
    presentationTheme,
    presentationNotes,
    changeSlideNote,
    presentation,
    closePresentation,
  } = useAulaDocumentosView();

  return (
    <>
      {migrationOpen ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMigrationOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMigrationOpen(false);
          }}
        >
          <section
            className="aula-documentos-modal aula-documentos-migration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-migration-title"
            ref={migrationRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-migration-title">Migrar apps antiguas</h2>
              <button
                type="button"
                className="aula-documentos-modal-close"
                onClick={() => setMigrationOpen(false)}
                aria-label="Cerrar migración de apps antiguas"
                autoFocus
              >
                <X size={16} aria-hidden />
              </button>
            </header>
            <div className="aula-documentos-import-menu">
              <p className="aula-documentos-import-intro">
                Notas, Diagramas y Presentaciones se convierten en un documento de Aula Documentos.
                Los datos originales se conservan y la migración se puede deshacer.
              </p>
              {migrationLoading === "status" && !migrationStatus ? (
                <p className="aula-documentos-import-meta">Consultando documentos antiguos…</p>
              ) : null}
              {migrationStatus ? (
                <div className="aula-documentos-migration-list" aria-label="Datos de apps antiguas">
                  {migrationStatus.sources.map((candidate) => (
                    <article className="aula-documentos-migration-item" key={candidate.source}>
                      <div className="aula-documentos-migration-head">
                        <strong>{AULA_MIGRATION_SOURCE_LABELS[candidate.source]}</strong>
                        <span className="aula-documentos-import-meta">
                          {!candidate.exists
                            ? "Sin datos"
                            : candidate.valid
                              ? `Guardado ${formatSourceDate(candidate.updatedAt) ?? "en una fecha desconocida"}`
                              : "No se puede leer"}
                        </span>
                      </div>
                      {candidate.message ? <p className="aula-documentos-import-warning">{candidate.message}</p> : null}
                    </article>
                  ))}
                </div>
              ) : null}
              {migrationStatus?.migration.active ? (
                <p className="aula-documentos-import-warning">
                  Migración aplicada{migrationStatus.migration.createdAt ? ` el ${formatSourceDate(migrationStatus.migration.createdAt)}` : ""}.
                  Los datos de origen siguen guardados. Puedes deshacer la migración si el documento de Aula sigue en la versión que se creó al migrar.
                </p>
              ) : (
                <>
                  {migrationStatus?.aula.exists ? (
                    <p className="aula-documentos-import-warning">
                      Aula Documentos ya tiene un documento. Los datos antiguos se añadirán al final para no borrar tu trabajo.
                    </p>
                  ) : null}
                </>
              )}
              {dirty ? (
                <p className="aula-documentos-import-warning">
                  Hay cambios sin guardar en Aula Documentos. Guárdalos antes de continuar.
                </p>
              ) : null}
              {migrationError ? <p className="aula-documentos-import-error" role="alert">{migrationError}</p> : null}
              {migrationNotice ? <p className="aula-documentos-import-status" role="status">{migrationNotice}</p> : null}
              <div className="aula-documentos-import-actions">
                <button type="button" className="aula-documentos-import-secondary" onClick={() => setMigrationOpen(false)}>
                  Cerrar
                </button>
                {migrationStatus?.migration.active ? (
                  <button
                    type="button"
                    className="aula-documentos-import-primary"
                    onClick={() => { void runMigration("rollback"); }}
                    disabled={readOnly || dirty || saving || migrationLoading !== null}
                  >
                    {migrationLoading === "rollback" ? "Deshaciendo…" : "Deshacer migración"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="aula-documentos-import-primary"
                    onClick={() => { void runMigration("migrate"); }}
                    disabled={
                      readOnly
                      || dirty
                      || saving
                      || migrationLoading !== null
                      || !migrationStatus
                      || !migrationStatus.sources.some((candidate) => candidate.exists && candidate.valid)
                    }
                  >
                    {migrationLoading === "migrate" ? "Migrando…" : "Migrar datos"}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {markdownSourceOpen ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMarkdownSourceOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMarkdownSourceOpen(false);
          }}
        >
          <section
            className="aula-documentos-modal aula-documentos-markdown-source-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-markdown-source-title"
            ref={markdownSourceRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-markdown-source-title">Fuente Markdown</h2>
              <button
                type="button"
                className="aula-documentos-modal-close"
                onClick={() => setMarkdownSourceOpen(false)}
                aria-label="Cerrar fuente Markdown"
                autoFocus
              >
                <X size={16} aria-hidden />
              </button>
            </header>
            <div className="aula-documentos-import-menu">
              <p className="aula-documentos-import-intro">
                Cada bloque separado por <code>---</code> es una diapositiva. Se reemplazará el contenido actual; el tema y las notas se conservan.
              </p>
              <textarea
                className="aula-documentos-markdown-source"
                value={markdownSourceDraft}
                onChange={(event) => setMarkdownSourceDraft(event.target.value)}
                aria-label="Fuente Markdown de la presentación"
                spellCheck={false}
              />
              {markdownSourceError ? <p className="aula-documentos-import-error" role="alert">{markdownSourceError}</p> : null}
              <div className="aula-documentos-import-actions">
                <button type="button" className="aula-documentos-import-secondary" onClick={() => setMarkdownSourceOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className="aula-documentos-import-primary" onClick={applyMarkdownSource}>
                  Aplicar fuente
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {slidePreview ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSlidePreview(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSlidePreview(null);
          }}
        >
          <section
            className="aula-documentos-modal aula-slide-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-preview-title"
            ref={slidePreviewRef}
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-preview-title">Vista previa: {slidePreview.title}</h2>
              <button
                type="button"
                className="aula-documentos-modal-close"
                onClick={() => setSlidePreview(null)}
                aria-label="Cerrar vista previa"
                autoFocus
              >
                <X size={16} aria-hidden />
              </button>
            </header>
            <div
              className={`aula-slide-preview aula-presentation-theme-${presentationTheme}`}
              dangerouslySetInnerHTML={{ __html: slidePreview.slides[slidePreview.index] ?? "" }}
            />
            <label className="aula-slide-preview-notes" htmlFor="aula-slide-preview-notes">
              <span>Notas del orador · diapositiva {slidePreview.index + 1}</span>
              <textarea
                id="aula-slide-preview-notes"
                value={presentationNotes[String(slidePreview.index)] ?? ""}
                onChange={(event) => changeSlideNote(slidePreview.index, event.target.value)}
                placeholder="Solo visibles para quien presenta."
                readOnly={readOnly}
              />
            </label>
            <div className="aula-slide-preview-nav">
              <button
                type="button"
                className="aula-documentos-import-secondary"
                onClick={() => setSlidePreview((current) => current ? { ...current, index: current.index - 1 } : current)}
                disabled={slidePreview.index <= 0}
              >
                Anterior
              </button>
              <span>Diapositiva {slidePreview.index + 1} de {slidePreview.slides.length}</span>
              <button
                type="button"
                className="aula-documentos-import-secondary"
                onClick={() => setSlidePreview((current) => current ? { ...current, index: current.index + 1 } : current)}
                disabled={slidePreview.index >= slidePreview.slides.length - 1}
              >
                Siguiente
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {presentation ? (
        <Suspense fallback={<div className="aula-documentos-presentation-fallback" role="status">Cargando presentación…</div>}>
          <PresentationView
            title={presentation.title}
            slides={presentation.slides}
            theme={presentationTheme}
            notes={presentationNotes}
            onExit={closePresentation}
          />
        </Suspense>
      ) : null}
    </>
  );
}
