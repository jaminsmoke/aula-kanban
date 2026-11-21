import { History, MessageSquare, Maximize2, Minimize2 } from "lucide-react";
import { useAulaDocumentosView } from "../aula-documentos-context";

/**
 * Barra inferior con sección actual, recuentos, guardado y modo enfoque.
 * @returns La barra de estado del documento.
 */
export function DocumentStatusBar() {
  const {
    activeOutlineIndex,
    outline,
    wordLabel,
    diagramLabel,
    chipText,
    dirty,
    saveConflict,
    readOnly,
    focusMode,
    toggleFocus,
    commentsOpen,
    commentCount,
    openComments,
    closeComments,
    canManageHistory,
    historyOpen,
    versionCount,
    openHistory,
    closeHistory,
  } = useAulaDocumentosView();
  const section = activeOutlineIndex >= 0 ? outline[activeOutlineIndex]?.text : null;
  const sectionLabel = section ?? "Sin sección";

  return (
    <footer className="aula-documentos-statusbar" aria-label="Estado del documento">
      <div className="aula-documentos-status-data" role="group" aria-label="Datos del documento">
        <span className="aula-documentos-status-section" aria-label={`Sección actual: ${sectionLabel}`}>
          Sección: <strong>{sectionLabel}</strong>
        </span>
        <span className="aula-documentos-count" aria-label={wordLabel}>{wordLabel}</span>
        <span className="aula-documentos-count" aria-label={diagramLabel}>{diagramLabel}</span>
        <span
          className={(dirty || saveConflict) && !readOnly ? "aula-documentos-chip is-dirty" : "aula-documentos-chip"}
          aria-label={`Estado de guardado: ${chipText}`}
        >
          {chipText}
        </span>
      </div>
      <div className="aula-documentos-status-actions" role="group" aria-label="Acciones de revisión">
        <button
          type="button"
          className="aula-documentos-comments-toggle"
          onClick={(event) => {
            if (historyOpen) closeHistory();
            if (commentsOpen) closeComments();
            else openComments(event.currentTarget);
          }}
          aria-pressed={commentsOpen}
          aria-label="Comentarios del documento"
          aria-keyshortcuts="Control+Alt+M Meta+Alt+M"
          title="Ctrl/Cmd+Alt+M"
        >
          <MessageSquare size={13} aria-hidden />
          <span>Comentarios{commentCount > 0 ? ` (${commentCount})` : ""}</span>
        </button>
        {canManageHistory ? (
          <button
            type="button"
            className="aula-documentos-history-toggle"
            onClick={(event) => {
              if (commentsOpen) closeComments();
              if (historyOpen) closeHistory();
              else openHistory(event.currentTarget);
            }}
            aria-pressed={historyOpen}
            aria-label="Historial de versiones"
          >
            <History size={13} aria-hidden />
            <span>Historial{versionCount > 0 ? ` (${versionCount})` : ""}</span>
          </button>
        ) : null}
        <button
          type="button"
          className="aula-documentos-focus-toggle"
          onClick={(event) => toggleFocus(event.currentTarget)}
          aria-pressed={focusMode}
          aria-label={focusMode ? "Salir del modo enfoque" : "Entrar en modo enfoque"}
          aria-keyshortcuts="Alt+Shift+F"
          title="Alt+Shift+F"
        >
          {focusMode ? <Minimize2 size={13} aria-hidden /> : <Maximize2 size={13} aria-hidden />}
          <span>{focusMode ? "Salir del enfoque" : "Modo enfoque"}</span>
        </button>
      </div>
    </footer>
  );
}
