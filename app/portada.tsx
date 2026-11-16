import "./portada.css";

/**
 * Portada pública de Aula Kanban: propuesta del producto, bloques de valor,
 * plugin de ChatGPT e inicio de sesión. Sin sesión no exige login; con sesión
 * se muestra el tablero en su lugar (ver `app/page.tsx`).
 * @param props - Ruta de inicio de sesión con retorno a la URL pedida.
 * @returns La portada visible sin sesión.
 */
export default function Portada({ signInHref }: { signInHref: string }) {
  return (
    <main className="portada">
      <div className="portada-shell">
        <header className="portada-hero">
          <div className="portada-hero-copy">
            <p className="portada-eyebrow">
              <span className="portada-mark" aria-hidden="true"><i /><i /><i /><i /></span>
              Aula Kanban
            </p>
            <h1>Tu clase, <span>en orden.</span></h1>
            <p className="portada-lead">Aula Kanban es un tablero colaborativo para el grupo de clase. Organiza tareas y entregas, reúne a las personas y comparte pizarras y materiales en un mismo espacio.</p>
            <div className="portada-actions">
              <a className="primary portada-action" href={signInHref} target="_top">Iniciar sesión con ChatGPT</a>
              <a className="secondary portada-action" href="/demo">Probar la demo</a>
              <a className="secondary portada-action" href="/documentacion">Ver documentación</a>
            </div>
            <p className="portada-note"><span className="portada-note-dot" aria-hidden="true" /> La cuenta de ChatGPT abre tus proyectos con los permisos que ya tienes. La demo no necesita cuenta y es de solo lectura.</p>
          </div>

          <div className="portada-preview" aria-hidden="true">
            <div className="portada-preview-frame">
              <div className="portada-preview-bar">
                <span className="portada-preview-dots"><i /><i /><i /></span>
                <span className="portada-preview-project">Proyecto de exposición</span>
                <span className="portada-preview-view">Clase</span>
              </div>
              <div className="portada-preview-body">
                <div className="portada-preview-heading">
                  <strong>Plan del proyecto</strong>
                  <span>6 tareas</span>
                </div>
                <div className="portada-board">
                  <div className="portada-column">
                    <div className="portada-column-title"><span className="portada-dot portada-dot--amber" /> Por hacer <span>2</span></div>
                    <div className="portada-task">
                      <span className="portada-task-tag portada-task-tag--amber" />
                      <strong>Elegir tema</strong>
                      <span className="portada-task-meta">Vie 21</span>
                    </div>
                    <div className="portada-task">
                      <span className="portada-task-tag" />
                      <strong>Buscar fuentes</strong>
                      <span className="portada-task-meta">Lun 24</span>
                    </div>
                  </div>
                  <div className="portada-column">
                    <div className="portada-column-title"><span className="portada-dot portada-dot--lavender" /> En curso <span>2</span></div>
                    <div className="portada-task">
                      <span className="portada-task-tag portada-task-tag--lavender" />
                      <strong>Preparar guion</strong>
                      <span className="portada-task-meta">Mié 26</span>
                    </div>
                    <div className="portada-task">
                      <span className="portada-task-tag" />
                      <strong>Diseñar portada</strong>
                      <span className="portada-task-meta">Vie 28</span>
                    </div>
                  </div>
                  <div className="portada-column">
                    <div className="portada-column-title"><span className="portada-dot portada-dot--success" /> Hecho <span>2</span></div>
                    <div className="portada-task">
                      <span className="portada-task-tag portada-task-tag--success" />
                      <strong>Repartir tareas</strong>
                      <span className="portada-task-meta">Lun 17</span>
                    </div>
                    <div className="portada-task">
                      <span className="portada-task-tag" />
                      <strong>Revisar el plan</strong>
                      <span className="portada-task-meta">Mar 18</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="portada-preview-chip"><span /> Plugin conectado</div>
          </div>
        </header>

        <section className="portada-values" aria-labelledby="portada-values-title">
          <div className="portada-section-head">
            <p className="portada-kicker">El día a día</p>
            <h2 id="portada-values-title">Un tablero para coordinar la clase</h2>
            <p>El proyecto, las entregas y las personas que participan comparten contexto. Sin hojas sueltas ni conversaciones dispersas.</p>
          </div>
          <ul>
            <li>
              <span className="portada-value-index" aria-hidden="true">01</span>
              <h3>Tareas y calendario</h3>
              <p>Planifica el proyecto en columnas, asigna responsables y marca prioridades. Cada entrega aparece también en el calendario.</p>
            </li>
            <li>
              <span className="portada-value-index" aria-hidden="true">02</span>
              <h3>Personas y materiales</h3>
              <p>Reúne alumnado, profesorado, archivos y enlaces. Cada cuenta ve el proyecto según su rol y las cuentas invitadas solo consultan.</p>
            </li>
            <li>
              <span className="portada-value-index" aria-hidden="true">03</span>
              <h3>Pizarras y apps</h3>
              <p>Comparte pizarras y abre las aplicaciones que tenga instaladas la instancia: Calculadora, Tabla periódica, Diagramas, Programación por bloques y más.</p>
            </li>
          </ul>
        </section>

        <section className="portada-plugin" aria-labelledby="portada-plugin-title">
          <div className="portada-plugin-copy">
            <p className="portada-kicker portada-kicker--on-dark">Plugin de ChatGPT</p>
            <h2 id="portada-plugin-title">Tu asistente trabaja con el mismo tablero</h2>
            <p>El plugin de Aula Kanban para Sites conecta ChatGPT y Codex con tus proyectos. Pide un resumen de clase, prepara la semana o crea y mueve tareas desde la conversación.</p>
            <ul className="portada-plugin-list">
              <li><span className="portada-check" aria-hidden="true">✓</span> Usa tu sesión de Sites, sin copiar tokens.</li>
              <li><span className="portada-check" aria-hidden="true">✓</span> Respeta los permisos de tu rol en cada proyecto.</li>
              <li><span className="portada-check" aria-hidden="true">✓</span> Deja cada llamada en la auditoría de la instancia.</li>
            </ul>
          </div>
          <div className="portada-chat" aria-hidden="true">
            <div className="portada-chat-bar">
              <span className="portada-chat-mark">AK</span>
              <strong>ChatGPT</strong>
              <span className="portada-chat-state">Plugin conectado</span>
            </div>
            <div className="portada-chat-body">
              <p className="portada-bubble portada-bubble--user">Prepara la semana del proyecto.</p>
              <div className="portada-bubble portada-bubble--assistant">
                <p>He revisado el tablero. Estas son las prioridades:</p>
                <ul>
                  <li>Tareas con entrega próxima</li>
                  <li>Material pendiente</li>
                  <li>Reparto por equipos</li>
                </ul>
                <span className="portada-bubble-meta">6 tareas · 2 entregas</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="portada-footer">
          <p className="portada-footer-brand"><span className="portada-footer-mark" aria-hidden="true"><i /><i /><i /><i /></span> Aula Kanban</p>
          <p>Cada instancia conserva sus propios proyectos y datos.</p>
          <nav className="portada-footer-links" aria-label="Enlaces del pie">
            <a href="/documentacion">Documentación y guía del plugin</a>
            <a href="/privacidad">Privacidad</a>
            <a href="/condiciones">Condiciones</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
