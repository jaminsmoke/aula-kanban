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
  } = useAulaDocumentosView();

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
          <span>{outline.length} {outline.length === 1 ? "sección" : "secciones"}</span>
        </div>
        {outline.length === 0 ? (
          <p className="aula-documentos-navigator-empty">Sin títulos H1–H3. Añade un título para crear el esquema.</p>
        ) : (
          <nav aria-label="Esquema del documento">
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
        )}
      </div>

      <div className="aula-documentos-navigator-block">
        <div className="aula-documentos-navigator-head">
          <h4>Diapositivas</h4>
          <span>{slides.length} en total</span>
        </div>
        <ol className="aula-documentos-slide-list" aria-label="Diapositivas del documento">
          {slides.map((slide) => (
            <li key={`${slide.index}-${slide.from}`}>
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
