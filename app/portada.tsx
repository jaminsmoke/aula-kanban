/**
 * Portada pública de Aula Kanban: qué es, enlace a la documentación
 * e inicio de sesión. Sin sesión no exige login; con sesión se muestra
 * el tablero en su lugar (ver `app/page.tsx`).
 * @param props - Ruta de inicio de sesión con retorno a la URL pedida.
 * @returns La portada visible sin sesión.
 */
export default function Portada({ signInHref }: { signInHref: string }) {
  return (
    <main className="session-page">
      <div className="session-card">
        <span className="session-mark" aria-hidden>▥</span>
        <p className="eyebrow"><span /> Aula Kanban</p>
        <h1>Tablero colaborativo para el grupo de clase</h1>
        <p>Organiza el trabajo del proyecto en tareas, sigue el avance de cada una y comparte pizarras y aplicaciones útiles con todo el grupo.</p>
        <p>Consulta la documentación para ver cómo funciona y qué puede hacer cada rol, o inicia sesión para abrir tus proyectos.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a className="primary session-signin" href={signInHref} target="_top">Iniciar sesión con ChatGPT</a>
          <a className="secondary session-signin" href="/documentacion">Ver documentación</a>
        </div>
      </div>
    </main>
  );
}
