import { lazy, Suspense } from "react";
import { EditorContent } from "@tiptap/react";
import { Code2, History } from "lucide-react";
import { AULA_DOCUMENT_TITLE_MAX_LENGTH, AULA_PRESENTATION_THEMES, type AulaPresentationTheme } from "../../../../../lib/domain/aula-documentos/document";
import { useAulaDocumentosView } from "../aula-documentos-context";
import { DocumentToolbar } from "./document-toolbar";

const DocumentStateDialogs = lazy(() => import("./dialogs/document-state-dialogs").then((module) => ({
  default: module.DocumentStateDialogs,
})));
const DocumentCopyImportDialogs = lazy(() => import("./dialogs/document-copy-import-dialogs").then((module) => ({
  default: module.DocumentCopyImportDialogs,
})));
const DocumentOverlayDialogs = lazy(() => import("./dialogs/document-overlay-dialogs").then((module) => ({
  default: module.DocumentOverlayDialogs,
})));

const DocumentHelp = lazy(() => import("../aula-documentos-help").then((module) => ({
  default: module.AulaDocumentosHelp,
})));

const DocumentShortcuts = lazy(() => import("../aula-documentos-help").then((module) => ({
  default: module.AulaDocumentosShortcuts,
})));

/**
 * Composición visual completa de Aula Documentos.
 * @returns El componente de la vista.
 */
export function DocumentWorkspace() {
  const {
    title,
    updateTitle,
    readOnly,
    invalidDocument,
    titleRef,
    editor,
    statusText,
    saveFailed,
    saveCurrent,
    openRecoveryCopies,
    recoveryCount,
    presentationTheme,
    changePresentationTheme,
    slideLabel,
    openSlidePreview,
    preparingPresentation,
    openMarkdownSource,
    newDocumentOpen,
    saveConflict,
    recoveryOpen,
    closePromptOpen,
    copiesOpen,
    copyImportOpen,
    importOpen,
    officePreviewOpen,
    migrationOpen,
    markdownSourceOpen,
    slidePreview,
    presentation,
  } = useAulaDocumentosView();

  return (
    <div className="aula-documentos-app">
      <DocumentToolbar />
      {newDocumentOpen || invalidDocument || saveConflict || recoveryOpen ? (
        <Suspense fallback={null}>
          <DocumentStateDialogs />
        </Suspense>
      ) : null}
      {closePromptOpen || copiesOpen || copyImportOpen || importOpen || officePreviewOpen ? (
        <Suspense fallback={null}>
          <DocumentCopyImportDialogs />
        </Suspense>
      ) : null}
      <div className="aula-documentos-layout">
        <section className="aula-documentos-stage" aria-label="Documento">
          <article className="aula-documentos-paper">
            <input
              className="aula-documentos-title"
              value={title}
              maxLength={AULA_DOCUMENT_TITLE_MAX_LENGTH}
              onChange={(event) => updateTitle(event.target.value)}
              aria-label="Título del documento"
              placeholder="Título del documento"
              spellCheck
              readOnly={readOnly || Boolean(invalidDocument)}
              ref={titleRef}
            />
            <div className="aula-documentos-divider" aria-hidden />
            <EditorContent editor={editor} className="aula-documentos-editor" />
            {!editor ? <p className="aula-documentos-editor-loading">Preparando el editor…</p> : null}
          </article>
        </section>

        <aside className="aula-documentos-side">
          <section className="aula-documentos-info">
            <h3>La suite documental</h3>
            <Suspense fallback={null}>
              <DocumentHelp />
            </Suspense>
            <p className="aula-documentos-status" role="status" aria-live="polite">{statusText}</p>
            {saveFailed && !readOnly ? (
              <button
                type="button"
                className="aula-documentos-retry"
                onClick={() => { void saveCurrent(false); }}
              >
                Reintentar guardado
              </button>
            ) : null}
            <button
              type="button"
              className="aula-documentos-preview-button aula-documentos-recovery-button"
              onClick={openRecoveryCopies}
            >
              <History size={14} aria-hidden />
              Copias locales{recoveryCount > 0 ? ` (${recoveryCount})` : ""}
            </button>
          </section>
          <section className="aula-documentos-info">
            <h3>Presentación</h3>
            <label className="aula-documentos-theme" htmlFor="aula-documentos-theme">
              <span>Tema</span>
              <select
                id="aula-documentos-theme"
                aria-label="Tema de la presentación"
                value={presentationTheme}
                onChange={(event) => changePresentationTheme(event.target.value as AulaPresentationTheme)}
                disabled={readOnly}
              >
                {AULA_PRESENTATION_THEMES.map((theme) => (
                  <option value={theme} key={theme}>
                    {theme === "aula" ? "Aula" : theme === "claro" ? "Claro" : "Oscuro"}
                  </option>
                ))}
              </select>
            </label>
            <p className="aula-documentos-slide-count">{slideLabel}</p>
            <button
              type="button"
              className="aula-documentos-preview-button"
              onClick={() => { void openSlidePreview(); }}
              disabled={!editor || preparingPresentation}
            >
              {preparingPresentation ? "Preparando…" : "Vista previa"}
            </button>
            <button
              type="button"
              className="aula-documentos-preview-button aula-documentos-markdown-source-button"
              onClick={openMarkdownSource}
              disabled={!editor || readOnly}
            >
              <Code2 size={14} aria-hidden />
              Fuente Markdown
            </button>
          </section>
          <section className="aula-documentos-help">
            <Suspense fallback={null}>
              <DocumentShortcuts />
            </Suspense>
          </section>
        </aside>
      </div>

      {migrationOpen || markdownSourceOpen || slidePreview || presentation ? (
        <Suspense fallback={null}>
          <DocumentOverlayDialogs />
        </Suspense>
      ) : null}
    </div>
  );
}
