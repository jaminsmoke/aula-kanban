import { ChevronDown, ChevronUp, Copy, RotateCcw, Trash2 } from "lucide-react";
import { useAulaDocumentosView } from "../aula-documentos-context";

/**
 * Esquema de títulos y navegador de diapositivas del documento activo.
 * @returns El panel de navegación.
 */
export function DocumentNavigator() {
  const {
    editor,
    outline,
    slides,
    activeOutlineIndex,
    activeSlideIndex,
    jumpToOutline,
    jumpToSlide,
    openSlidePreview,
    preparingPresentation,
    outlineOpen,
    toggleOutline,
    readOnly,
    canUndoStructure,
    moveSlide,
    duplicateSlide,
    deleteSlide,
    undoStructure,
  } = useAulaDocumentosView();

  /**
   * Confirma la eliminación de una diapositiva.
   * @param index - Índice de la diapositiva.
   * @param title - Título visible.
   */
  function confirmDelete(index: number, title: string) {
    const message = slides.length === 1
      ? "¿Vaciar la única diapositiva? Podrás deshacerlo desde la estructura."
      : `¿Eliminar la diapositiva ${index + 1} «${title}»? Podrás deshacerlo desde la estructura.`;
    if (!window.confirm(message)) return;
    deleteSlide(index);
  }

  if (!editor) {
    return (
      <section className="aula-documentos-info aula-documentos-navigator" aria-label="Navegación del documento">
        <h3>Navegación</h3>
        <p>Preparando el documento…</p>
      </section>
    );
  }

  return (
    <section className="aula-documentos-info aula-documentos-navigator" aria-label="Navegación del documento">
      <h3>Navegación</h3>

      <div className="aula-documentos-navigator-block">
        <div className="aula-documentos-navigator-head">
          <h4>Esquema</h4>
          <div className="aula-documentos-navigator-head-actions">
            <span>{outline.length} {outline.length === 1 ? "sección" : "secciones"}</span>
            <button
              type="button"
              className="aula-documentos-navigator-toggle"
              onClick={toggleOutline}
              aria-expanded={outlineOpen}
              aria-controls="aula-documentos-outline-list"
              aria-label={outlineOpen ? "Ocultar esquema" : "Mostrar esquema"}
            >
              {outlineOpen ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>
        {outlineOpen && outline.length === 0 ? (
          <p className="aula-documentos-navigator-empty">Sin títulos H1–H3. Añade un título para crear el esquema.</p>
        ) : null}
        {outlineOpen && outline.length > 0 ? (
          <nav id="aula-documentos-outline-list" aria-label="Esquema del documento">
            <ul className="aula-documentos-outline-list">
              {outline.map((row, index) => (
                <li key={`${row.from}-${row.text}`}>
                  <button
                    type="button"
                    className={`aula-documentos-outline-row aula-documentos-outline-depth-${Math.min(row.depth, 2)}`}
                    onClick={() => jumpToOutline(row)}
                    aria-current={index === activeOutlineIndex ? "location" : undefined}
                  >
                    {row.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      <div className="aula-documentos-navigator-block">
        <div className="aula-documentos-navigator-head">
          <h4>Diapositivas</h4>
          <div className="aula-documentos-navigator-head-actions">
            <span>{slides.length} en total</span>
            {!readOnly ? (
              <button
                type="button"
                className="aula-documentos-navigator-toggle"
                onClick={() => { undoStructure(); }}
                disabled={!canUndoStructure}
                aria-label="Deshacer cambio de estructura"
              >
                <RotateCcw size={11} aria-hidden />
                Deshacer
              </button>
            ) : null}
          </div>
        </div>
        <ol className="aula-documentos-slide-list" aria-label="Diapositivas del documento">
          {slides.map((slide) => (
            <li className="aula-documentos-slide-item" key={`${slide.index}-${slide.from}`}>
              <button
                type="button"
                className="aula-documentos-slide-row"
                onClick={() => jumpToSlide(slide)}
                aria-current={slide.index === activeSlideIndex ? "location" : undefined}
                aria-label={`Ir a la diapositiva ${slide.index + 1}: ${slide.title}`}
              >
                <span className="aula-documentos-slide-number">{slide.index + 1}</span>
                <span className="aula-documentos-slide-title">{slide.title}</span>
              </button>
              {!readOnly ? (
                <div className="aula-documentos-slide-actions">
                  <button
                    type="button"
                    onClick={() => { moveSlide(slide.index, -1); }}
                    disabled={slide.index === 0}
                    aria-label={`Subir diapositiva ${slide.index + 1}: ${slide.title}`}
                  >
                    <ChevronUp size={12} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => { moveSlide(slide.index, 1); }}
                    disabled={slide.index >= slides.length - 1}
                    aria-label={`Bajar diapositiva ${slide.index + 1}: ${slide.title}`}
                  >
                    <ChevronDown size={12} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => { duplicateSlide(slide.index); }}
                    aria-label={`Duplicar diapositiva ${slide.index + 1}: ${slide.title}`}
                  >
                    <Copy size={12} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(slide.index, slide.title)}
                    aria-label={`Eliminar diapositiva ${slide.index + 1}: ${slide.title}`}
                  >
                    <Trash2 size={12} aria-hidden />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="aula-documentos-preview-button"
          onClick={() => { void openSlidePreview(activeSlideIndex); }}
          disabled={preparingPresentation}
        >
          {preparingPresentation ? "Preparando…" : `Vista previa desde la diapositiva ${activeSlideIndex + 1}`}
        </button>
      </div>
    </section>
  );
}
