"use client";

import { ArrowLeft, Server, X } from "lucide-react";
import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import SpaceWindow from "./space-window";
import Modal from "../modal";
import { visibleTools, type SpaceRole, type SpaceTool } from "./tools";

// Cada herramienta del hub se registra aquí como componente lazy: su código
// solo se descarga cuando su ventana se abre por primera vez.
const toolApps: Record<string, ComponentType<{ projectId: string; role: SpaceRole; instanceUrl?: string }>> = {
  nodum: lazy(() => import("./nodum-app")),
  excalidraw: lazy(() => import("./excalidraw-app")),
  affine: lazy(() => import("./affine-app")),
};

type OpenWindow = {
  tool: SpaceTool;
  minimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  maximized: boolean;
  saved?: { position: { x: number; y: number }; size: { width: number; height: number } };
  zIndex: number;
};

/**
 * Hub «Mi espacio»: un escritorio con iconos que abren ventanas estilo
 * macOS (arrastrables, minimizables a un dock) según el rol.
 * @param props - Rol del usuario, proyecto activo y salida al tablero.
 * @returns El escritorio a pantalla completa con sus ventanas y barra superior.
 */
export default function SpaceView({ role, projectId, onExit }: { role: SpaceRole; projectId: string; onExit: () => void }) {
  const tools = visibleTools(role);
  const [managed, setManaged] = useState<{ id: string; status: string; url: string | null }[]>([]);
  const [managerConfigured, setManagerConfigured] = useState<boolean | null>(null);
  const [managerError, setManagerError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/space-apps?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { configured: boolean; apps: typeof managed };
      setManaged(data.apps); setManagerConfigured(data.configured); setManagerError("");
    } catch { setManagerError("No se pudo consultar el gestor de aplicaciones."); }
  }, [projectId]);
  useEffect(() => { const first = window.setTimeout(() => { void refresh(); }, 0); const timer = window.setInterval(() => { void refresh(); }, 10000); return () => { window.clearTimeout(first); window.clearInterval(timer); }; }, [refresh]);
  const manage = async (id: string, action: "install" | "uninstall") => {
    if (action === "uninstall" && !window.confirm("Se detendrá y retirará esta aplicación para todos los proyectos. Sus datos se conservarán. ¿Continuar?")) return;
    try {
      const response = await fetch("/api/space-apps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action }) });
      if (!response.ok) throw new Error();
      await refresh();
    } catch { setManagerError("No se pudo iniciar la operación. Comprueba el gestor del VPS."); }
  };
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const zCounter = useRef(10);

  const open = (tool: SpaceTool) => {
    setWindows((current) => {
      const existing = current.find((item) => item.tool.id === tool.id);
      zCounter.current += 1;
      if (existing) {
        return current.map((item) => (item.tool.id === tool.id ? { ...item, minimized: false, zIndex: zCounter.current } : item));
      }
      const width = Math.min(880, window.innerWidth - 24);
      const height = Math.min(560, window.innerHeight - 72);
      const offset = Math.max(12, Math.min(150 + current.length * 30, window.innerWidth - width - 12));
      return [...current, { tool, minimized: false, position: { x: offset, y: 12 }, size: { width, height }, maximized: false, zIndex: zCounter.current }];
    });
  };

  const focus = (id: string) => setWindows((current) => {
    zCounter.current += 1;
    return current.map((item) => (item.tool.id === id ? { ...item, zIndex: zCounter.current } : item));
  });
  const close = (id: string) => setWindows((current) => current.filter((item) => item.tool.id !== id));
  const minimize = (id: string) => setWindows((current) => current.map((item) => (item.tool.id === id ? { ...item, minimized: true } : item)));
  const move = (id: string, position: { x: number; y: number }) => setWindows((current) => current.map((item) => (item.tool.id === id ? { ...item, position } : item)));
  const resize = (id: string, size: { width: number; height: number }) => setWindows((current) => current.map((item) => (item.tool.id === id ? { ...item, size } : item)));
  const zoom = (id: string) => setWindows((current) => current.map((item) => {
    if (item.tool.id !== id) return item;
    if (item.maximized && item.saved) return { ...item, maximized: false, position: item.saved.position, size: item.saved.size, saved: undefined };
    return { ...item, maximized: true, saved: { position: item.position, size: item.size }, position: { x: 0, y: 0 }, size: { width: window.innerWidth, height: window.innerHeight - 48 } };
  }));

  const active = windows.filter((item) => !item.minimized).sort((a, b) => b.zIndex - a.zIndex)[0];
  const restore = (id: string) => setWindows((current) => current.map((item) => (item.tool.id === id ? { ...item, minimized: false } : item)));

  return (
    <section className="space-view" aria-label="Mi espacio">
      <div className="space-topbar">
        <button type="button" className="space-back" onClick={onExit} title="Volver a Aula Kanban"><ArrowLeft size={16} aria-hidden /> Aula Kanban</button>
        <p className="space-topbar-title">{active ? active.tool.name : "Mi espacio"}</p>
        <nav className="space-taskbar" aria-label="Ventanas minimizadas">
          {windows.filter((item) => item.minimized).map((item) => {
            const Icon = item.tool.icon;
            return (
              <button key={item.tool.id} type="button" className="space-minimized-icon" title={`${item.tool.name} (minimizada)`} aria-label={`Restaurar ${item.tool.name}`} onClick={() => restore(item.tool.id)}>
                <Icon size={18} strokeWidth={1.9} />
              </button>
            );
          })}
        </nav>
      </div>
      <div className="space-desktop" aria-label="Escritorio de herramientas">
        {managerConfigured === false && !noticeDismissed ? (
          <div className="space-vps-notice" role="status">
            <span className="space-vps-notice-icon" aria-hidden><Server size={20} /></span>
            <p className="space-vps-notice-text">
              <strong>Las aplicaciones del VPS son opcionales.</strong> El gestor de instalación está en desarrollo y aún no está disponible. Las herramientas integradas se pueden usar normalmente.
              {(role === "owner" || role === "admin") && <> <button type="button" className="text-button" onClick={() => setGuideOpen(true)}>Cómo configurar el VPS</button></>}
            </p>
            <button type="button" className="space-vps-notice-close" onClick={() => setNoticeDismissed(true)} aria-label="Cerrar aviso"><X size={16} aria-hidden /></button>
          </div>
        ) : null}
        {managerError && <p role="alert" className="space-empty">{managerError}</p>}
        {tools.length === 0 ? (
          <p className="space-empty">Todavía no hay herramientas en Mi espacio. Se irán añadiendo aquí.</p>
        ) : null}
        <div className="space-icons">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const instance = managed.find((app) => app.id === tool.id);
            const ready = tool.host === "site" || instance?.status === "installed";
            return (
              <div key={tool.id}>
              <button type="button" className={`space-tool${ready ? "" : " space-tool--locked"}`} onClick={() => open(tool)} title={tool.description}>
                <span className="space-tool-icon" aria-hidden><Icon size={30} strokeWidth={1.9} /></span>
                <span className="space-tool-name">{tool.name}</span>
                {ready ? null : <span className="space-tool-badge" aria-hidden><Server size={10} /> VPS</span>}
              </button>
              {tool.host === "vps" && instance && (role === "owner" || role === "admin") && <button type="button" disabled={instance.status === "working"} onClick={() => void manage(tool.id, instance.status === "installed" || instance.status === "stopped" ? "uninstall" : "install")}>
                {instance.status === "working" ? "Procesando…" : instance.status === "installed" || instance.status === "stopped" ? "Desinstalar" : "Instalar"}
              </button>}
              {instance?.status === "error" && <span role="alert">Error en la operación</span>}
              </div>
            );
          })}
        </div>
        {windows.map((item) => {
          const App = toolApps[item.tool.id];
          return (
            <SpaceWindow
              key={item.tool.id}
              title={item.tool.name}
              position={item.position}
              size={item.size}
              zIndex={item.zIndex}
              maximized={item.maximized}
              minimized={item.minimized}
              onMove={(position) => move(item.tool.id, position)}
              onResize={(size) => resize(item.tool.id, size)}
              onFocus={() => focus(item.tool.id)}
              onClose={() => close(item.tool.id)}
              onMinimize={() => minimize(item.tool.id)}
              onZoom={() => zoom(item.tool.id)}
            >
              {App ? <Suspense fallback={<p className="space-loading">Cargando {item.tool.name}…</p>}><App projectId={projectId} role={role} instanceUrl={managed.find(app => app.id === item.tool.id && app.status === "installed")?.url ?? undefined} /></Suspense> : <p className="space-loading">Próximamente.</p>}
            </SpaceWindow>
          );
        })}
      </div>
      {guideOpen && <Modal title="Conectar un VPS" onClose={() => setGuideOpen(false)}><div className="share-content">
        <p>El gestor de aplicaciones para VPS está en desarrollo y todavía no se puede conectar. Cuando esté disponible, permitirá compartir las aplicaciones instaladas entre todos los proyectos de esta copia de Aula Kanban.</p>
        <p>Podrás pedir ayuda a un agente para revisar tu VPS y sus servicios existentes. La configuración inicial no instala aplicaciones del catálogo. Espera a que el gestor esté disponible antes de configurar la conexión.</p>
        <p>Solo el propietario y los administradores podrán instalar o desinstalar aplicaciones. No pegues contraseñas ni tokens en el chat: configúralos mediante los ajustes seguros que indique el agente.</p>
        <label>Mensaje para el agente<textarea className="remix-prompt" readOnly value="Ayúdame a conectar mi VPS con Docker Compose a mi propia instancia de Aula Kanban. Revisa primero mis servicios y copias existentes, prepara una conexión segura sin instalar aplicaciones del catálogo y explícame cómo configurar las credenciales sin compartirlas en el chat." onFocus={(event) => event.currentTarget.select()} /></label>
        <div className="remix-controls"><button type="button" className="secondary" onClick={async () => { try { await navigator.clipboard.writeText("Ayúdame a conectar mi VPS con Docker Compose a mi propia instancia de Aula Kanban. Revisa primero mis servicios y copias existentes, prepara una conexión segura sin instalar aplicaciones del catálogo y explícame cómo configurar las credenciales sin compartirlas en el chat."); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Mensaje copiado" : "Copiar mensaje"}</button><a className="primary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Abrir ChatGPT</a></div>
      </div></Modal>}
    </section>
  );
}
