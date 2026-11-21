import { useState } from "react";
import { Archive, Copy, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { formatDateTime } from "../../../shared/ui/date";
import type { AulaDocumentSummary } from "../hooks/use-aula-document-suite";
import { useAulaDocumentosView } from "../aula-documentos-context";

/**
 * Fecha corta de un documento.
 * @param document - Documento.
 * @returns Texto legible.
 */
function dateLabel(document: AulaDocumentSummary): string {
  return formatDateTime(document.updatedAt) ?? "Sin fecha";
}

/**
 * Lista y acciones de la suite documental.
 * @returns El panel de documentos.
 */
export function DocumentSuitePanel() {
  const {
    suite,
    suiteDocumentId,
    suiteLoading,
    suiteError,
    readOnly,
    openSuiteDocument,
    createSuiteDocument,
    duplicateSuiteDocument,
    renameSuiteDocument,
    archiveSuiteDocument,
    deleteSuiteDocument,
    restoreSuiteDocument,
  } = useAulaDocumentosView();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  function startRename(document: AulaDocumentSummary) {
    setRenamingId(document.id);
    setRenameDraft(document.title);
  }

  async function applyRename() {
    if (!renamingId) return;
    await renameSuiteDocument(renamingId, renameDraft);
    setRenamingId(null);
  }

  function confirmDelete(document: AulaDocumentSummary) {
    if (!window.confirm(`¿Eliminar «${document.title}»? Se conservará en la papelera y podrás restaurarlo.`)) return;
    void deleteSuiteDocument(document.id);
  }

  return (
    <section className="aula-documentos-info aula-documentos-suite" aria-label="Documentos de la suite">
      <div className="aula-documentos-suite-head">
        <h3>Documentos</h3>
        <button
          type="button"
          className="aula-documentos-preview-button"
          onClick={() => { void createSuiteDocument(); }}
          disabled={readOnly || suiteLoading}
        >
          <Plus size={14} aria-hidden />
          Nuevo
        </button>
      </div>
      {suiteLoading ? <p className="aula-documentos-suite-meta">Cargando documentos.</p> : null}
      {suiteError ? <p className="aula-documentos-import-error" role="alert">{suiteError}</p> : null}
      {!suiteLoading && suite.active.length === 0 ? (
        <p className="aula-documentos-suite-meta">Todavía no hay documentos. Crea el primero para empezar.</p>
      ) : null}
      <ul className="aula-documentos-suite-list">
        {suite.active.map((document) => (
          <li key={document.id} className={document.id === suiteDocumentId ? "is-current" : ""}>
            {renamingId === document.id ? (
              <form
                className="aula-documentos-suite-rename"
                onSubmit={(event) => { event.preventDefault(); void applyRename(); }}
              >
                <label htmlFor={`aula-documentos-rename-${document.id}`}>Nuevo título</label>
                <input
                  id={`aula-documentos-rename-${document.id}`}
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  autoFocus
                  maxLength={120}
                />
                <div>
                  <button type="submit" className="aula-documentos-preview-button">Guardar</button>
                  <button type="button" className="aula-documentos-preview-button" onClick={() => setRenamingId(null)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  className="aula-documentos-suite-doc"
                  onClick={() => { void openSuiteDocument(document.id); }}
                  aria-label={`Abrir ${document.title}`}
                  aria-current={document.id === suiteDocumentId ? "page" : undefined}
                >
                  <strong>{document.title || "Documento sin título"}</strong>
                  <span>{document.excerpt || "Sin extracto."}</span>
                  <small>{dateLabel(document)}</small>
                </button>
                <div className="aula-documentos-suite-actions">
                  <button type="button" aria-label={`Renombrar ${document.title}`} onClick={() => startRename(document)} disabled={readOnly}><Pencil size={13} aria-hidden /></button>
                  <button type="button" aria-label={`Duplicar ${document.title}`} onClick={() => { void duplicateSuiteDocument(document.id); }} disabled={readOnly}><Copy size={13} aria-hidden /></button>
                  <button type="button" aria-label={`Archivar ${document.title}`} onClick={() => { void archiveSuiteDocument(document.id); }} disabled={readOnly}><Archive size={13} aria-hidden /></button>
                  <button type="button" aria-label={`Eliminar ${document.title}`} onClick={() => confirmDelete(document)} disabled={readOnly}><Trash2 size={13} aria-hidden /></button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {suite.archived.length > 0 || suite.deleted.length > 0 ? (
        <div className="aula-documentos-suite-secondary">
          <h4>Archivados y papelera</h4>
          {[...suite.archived, ...suite.deleted].map((document) => (
            <div className="aula-documentos-suite-secondary-row" key={document.id}>
              <span>{document.title || "Documento sin título"}</span>
              <button type="button" aria-label={`Restaurar ${document.title}`} onClick={() => { void restoreSuiteDocument(document.id); }} disabled={readOnly}>
                <RotateCcw size={13} aria-hidden />
                Restaurar
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
