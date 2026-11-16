/**
 * Portada pública de Aula Kanban: propuesta del producto, bloques de valor,
 * plugin de ChatGPT e inicio de sesión. Sin sesión no exige login; con sesión
 * se muestra el tablero en su lugar (ver `app/page.tsx`).
 * @param props - Ruta de inicio de sesión con retorno a la URL pedida.
 * @returns La portada visible sin sesión.
 */
export default function Portada({ signInHref }: { signInHref: string }) {
  return (
    <main className="session-page">
      <div className="session-card portada">
        <header className="portada-hero">
          <span className="session-mark" aria-hidden>▥</span>
          <p className="eyebrow"><span /> Aula Kanban</p>
          <h1>Tu clase, en orden.</h1>
          <p className="portada-lead">Aula Kanban es un tablero colaborativo para el grupo de clase. Organiza tareas y entregas, reúne a las personas y comparte pizarras y materiales en un mismo espacio.</p>
          <div className="portada-actions">
            <a className="primary session-signin" href={signInHref} target="_top">Iniciar sesión con ChatGPT</a>
            <a className="secondary session-signin" href="/documentacion">Ver documentación</a>
          </div>
          <p className="portada-note">La cuenta de ChatGPT abre tus proyectos con los permisos que ya tienes.</p>
        </header>

        <section className="portada-values" aria-labelledby="portada-values-title">
          <h2 id="portada-values-title">Un tablero para coordinar la clase</h2>
          <ul>
            <li>
              <h3>Tareas y calendario</h3>
              <p>Planifica el proyecto en columnas, asigna responsables y marca prioridades. Cada entrega aparece también en el calendario.</p>
            </li>
            <li>
              <h3>Personas y materiales</h3>
              <p>Reúne alumnado, profesorado, archivos y enlaces. Cada cuenta ve el proyecto según su rol y las cuentas invitadas solo consultan.</p>
            </li>
            <li>
              <h3>Pizarras y apps</h3>
              <p>Comparte pizarras y abre las aplicaciones que tenga instaladas la instancia: Calculadora, Tabla periódica, Diagramas, Programación por bloques y más.</p>
            </li>
          </ul>
        </section>

        <section className="portada-plugin" aria-labelledby="portada-plugin-title">
          <p className="eyebrow"><span /> Plugin de ChatGPT</p>
          <h2 id="portada-plugin-title">Tu asistente trabaja con el mismo tablero</h2>
          <p>El plugin de Aula Kanban para Sites conecta ChatGPT y Codex con tus proyectos. Pide un resumen de clase, prepara la semana o crea y mueve tareas desde la conversación.</p>
          <ul>
            <li>Usa tu sesión de Sites, sin copiar tokens.</li>
            <li>Respeta los permisos de tu rol en cada proyecto.</li>
            <li>Deja cada llamada en la auditoría de la instancia.</li>
          </ul>
        </section>

        <footer className="portada-footer">
          <p>Aula Kanban · Cada instancia conserva sus propios proyectos y datos.</p>
          <a href="/documentacion">Documentación y guía del plugin</a>
        </footer>
      </div>
    </main>
  );
}
