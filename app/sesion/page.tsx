import { chatGPTSignInPath } from "../chatgpt-auth";

export default function SessionPage() {
  return <main className="session-page">
    <div className="session-card">
      <span className="session-mark" aria-hidden>▥</span>
      <p className="eyebrow"><span /> Aula Kanban</p>
      <h1>Has cerrado sesión</h1>
      <p>Inicia sesión para acceder a tus proyectos. Si quieres usar otra cuenta, selecciónala durante el acceso a ChatGPT.</p>
      <a className="primary session-signin" href={chatGPTSignInPath("/")} target="_top">Iniciar sesión con ChatGPT</a>
    </div>
  </main>;
}
