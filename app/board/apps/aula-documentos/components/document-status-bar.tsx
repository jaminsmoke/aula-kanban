import { Maximize2, Minimize2 } from "lucide-react";
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
  } = useAulaDocumentosView();
  const section = activeOutlineIndex >= 0 ? outline[activeOutlineIndex]?.text : null;
  const sectionLabel = section ?? "Sin sección";

  return (
    <footer className="aula-documentos-statusbar" aria-label="Estado del documento">
      <span className="aula-documentos-status-section" aria-label={`Sección actual: ${sectionLabel}`}>
        Sección: <strong>{sectionLabel}</strong>
      </span>
      <span className="aula-documentos-count">{wordLabel}</span>
      <span className="aula-documentos-count">{diagramLabel}</span>
      <span className={(dirty || saveConflict) && !readOnly ? "aula-documentos-chip is-dirty" : "aula-documentos-chip"}>
        {chipText}
      </span>
      <button
        type="button"
        className="aula-documentos-focus-toggle"
        onClick={(event) => toggleFocus(event.currentTarget)}
        aria-pressed={focusMode}
        aria-label={focusMode ? "Salir del modo enfoque" : "Entrar en modo enfoque"}
        title="Alt+Shift+F"
      >
        {focusMode ? <Minimize2 size={13} aria-hidden /> : <Maximize2 size={13} aria-hidden />}
        <span>{focusMode ? "Salir del enfoque" : "Modo enfoque"}</span>
      </button>
    </footer>
  );
}
