import Link from "next/link";
import "./legal.css";

/** Sección del documento legal. */
export type LegalSection = {
  /** Identificador del ancla, sin prefijo. */
  id: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
  closing?: string[];
};

/** Datos de la página legal. */
type LegalPageProps = {
  title: string;
  lead: string;
  updatedIso: string;
  updatedLabel: string;
  current: "privacidad" | "condiciones";
  sections: LegalSection[];
};

/** Correo de contacto legal de esta instancia. */
const CONTACT_EMAIL = "jorgemd@siberia.solutions";

/**
 * Página legal pública: cabecera con la marca, documento y pie con el
 * contacto. No usa sesión ni estado de cliente.
 * @param props - Título, entradilla, fecha y secciones del documento.
 * @returns El documento legal completo.
 */
export function LegalPage({ title, lead, updatedIso, updatedLabel, current, sections }: LegalPageProps) {
  return (
    <div className="legal">
      <div className="legal-shell">
        <header className="legal-header">
          <Link className="legal-brand" href="/">
            <span className="legal-mark" aria-hidden="true"><i /><i /><i /><i /></span>
            <span className="legal-brand-text">
              <strong>Aula Kanban</strong>
              <small>Tablero colaborativo de tareas</small>
            </span>
          </Link>
          <nav className="legal-nav" aria-label="Páginas públicas">
            <a href="/documentacion">Documentación</a>
            <a href="/privacidad" aria-current={current === "privacidad" ? "page" : undefined}>Privacidad</a>
            <a href="/condiciones" aria-current={current === "condiciones" ? "page" : undefined}>Condiciones</a>
          </nav>
        </header>

        <main className="legal-main">
          <p className="legal-eyebrow">Legal</p>
          <h1>{title}</h1>
          <p className="legal-lead">{lead}</p>
          <p className="legal-updated">
            Última actualización: <time dateTime={updatedIso}>{updatedLabel}</time>
          </p>

          {sections.map((section) => (
            <section key={section.id} className="legal-section" aria-labelledby={`legal-${section.id}`}>
              <h2 id={`legal-${section.id}`}>{section.title}</h2>
              {section.paragraphs?.map((paragraph, index) => (
                <p key={`${section.id}-p-${index}`}>{paragraph}</p>
              ))}
              {section.items ? (
                <ul>
                  {section.items.map((item, index) => <li key={`${section.id}-i-${index}`}>{item}</li>)}
                </ul>
              ) : null}
              {section.closing?.map((paragraph, index) => (
                <p key={`${section.id}-c-${index}`}>{paragraph}</p>
              ))}
            </section>
          ))}
        </main>

        <footer className="legal-footer">
          <p className="legal-footer-brand">Aula Kanban · SiberIA Solutions</p>
          <p className="legal-footer-contact">
            Contacto: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
          <nav className="legal-footer-links" aria-label="Enlaces legales">
            <a href="/privacidad">Privacidad</a>
            <a href="/condiciones">Condiciones</a>
            <a href="/documentacion">Documentación</a>
            <Link href="/">Volver al inicio</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
