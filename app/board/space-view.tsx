"use client";

import { ArrowLeft } from "lucide-react";
import { Suspense, lazy, useRef, useState, type ComponentType } from "react";
import SpaceWindow from "./space-window";
import { visibleTools, type SpaceRole, type SpaceTool } from "./tools";

// Cada herramienta del hub se registra aquí como componente lazy: su código
// solo se descarga cuando su ventana se abre por primera vez.
const toolApps: Record<string, ComponentType<{ projectId: string; role: SpaceRole }>> = {
  nodum: lazy(() => import("./nodum-app")),
  excalidraw: lazy(() => import("./excalidraw-app")),
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
  const [windows, setWindows] = useState<OpenWindow[]>([]);
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
        {tools.length === 0 ? (
          <p className="space-empty">Todavía no hay herramientas en Mi espacio. Se irán añadiendo aquí.</p>
        ) : null}
        <div className="space-icons">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button key={tool.id} type="button" className="space-tool" onClick={() => open(tool)} title={tool.description}>
                <span className="space-tool-icon" aria-hidden><Icon size={30} strokeWidth={1.9} /></span>
                <span className="space-tool-name">{tool.name}</span>
              </button>
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
              {App ? <Suspense fallback={<p className="space-loading">Cargando {item.tool.name}…</p>}><App projectId={projectId} role={role} /></Suspense> : <p className="space-loading">Próximamente.</p>}
            </SpaceWindow>
          );
        })}
      </div>
    </section>
  );
}
