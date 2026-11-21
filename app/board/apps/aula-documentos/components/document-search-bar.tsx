import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useAulaDocumentosView } from "../aula-documentos-context";

/**
 * Barra de búsqueda y reemplazo del documento activo.
 * @returns La barra o `null` si está cerrada.
 */
export function DocumentSearchBar() {
  const {
    searchOpen,
    replaceOpen,
    query,
    setQuery,
    replacement,
    setReplacement,
    caseSensitive,
    setCaseSensitive,
    diacriticsSensitive,
    setDiacriticsSensitive,
    matches,
    activeIndex,
    closeSearch,
    goNext,
    goPrevious,
    replaceCurrent,
    replaceAll,
    readOnly,
  } = useAulaDocumentosView();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [searchOpen]);

  if (!searchOpen) return null;

  const position = matches.length === 0 ? "0 resultados" : `${activeIndex + 1} de ${matches.length}`;

  return (
    <form
      className="aula-documentos-search"
      role="search"
      aria-label="Buscar en el documento"
      onSubmit={(event) => {
        event.preventDefault();
        goNext();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          goNext();
        }
        if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          goPrevious();
        }
      }}
    >
      <div className="aula-documentos-search-row">
        <Search size={15} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar en el documento"
          aria-label="Texto que buscar"
          autoComplete="off"
        />
        <span className="aula-documentos-search-count" role="status" aria-live="polite">{position}</span>
        <button type="button" aria-label="Resultado anterior" onClick={goPrevious} disabled={matches.length === 0}><ChevronUp size={15} aria-hidden /></button>
        <button type="button" aria-label="Resultado siguiente" onClick={goNext} disabled={matches.length === 0}><ChevronDown size={15} aria-hidden /></button>
        <label className="aula-documentos-search-toggle">
          <input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />
          Mayúsculas
        </label>
        <label className="aula-documentos-search-toggle">
          <input type="checkbox" checked={diacriticsSensitive} onChange={(event) => setDiacriticsSensitive(event.target.checked)} />
          Acentos
        </label>
        <button type="button" aria-label="Cerrar búsqueda" onClick={closeSearch}><X size={15} aria-hidden /></button>
      </div>
      {replaceOpen ? (
        <div className="aula-documentos-search-row aula-documentos-search-replace">
          <input
            type="text"
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            placeholder="Reemplazar por"
            aria-label="Texto de reemplazo"
          />
          <button type="button" className="aula-documentos-preview-button" onClick={replaceCurrent} disabled={readOnly || matches.length === 0}>Reemplazar</button>
          <button type="button" className="aula-documentos-preview-button" onClick={replaceAll} disabled={readOnly || matches.length === 0}>Reemplazar todo</button>
        </div>
      ) : null}
    </form>
  );
}
