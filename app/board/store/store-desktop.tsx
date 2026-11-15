"use client";

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation } from "motion/react";
import StoreWindow from "./store-window";
import type { StoreAction } from "./catalog/apps-store";
import { AulaStoreIcon } from "./catalog/aula-store-icon";

// La tienda solo se descarga al abrirla.
const AppsStore = lazy(() => import("./catalog/apps-store"));
import { visibleTools, type StoreRole, type StoreTool } from "./tools";
import { parseBoardUrl } from "../shared/board-url";
import { useSpaceSocket } from "./use-space-socket";
import { toolApps, toolWindow } from "../apps/registry";
import "./store-desktop.css";

type OpenWindow = {
  tool: StoreTool;
  minimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  maximized: boolean;
  saved?: { position: { x: number; y: number }; size: { width: number; height: number } };
  zIndex: number;
};

/**
 * Tienda: un escritorio con iconos que abren ventanas estilo macOS
 * (arrastrables, minimizables a un dock) según el rol.
 * @param props - Rol del usuario y proyecto activo.
 * @returns El escritorio dentro del contenido de Administración.
 */
export default function StoreDesktop({ role, projectId }: { role: StoreRole; projectId: string }) {
  const tools = visibleTools(role);
  const [managed, setManaged] = useState<{ id: string; status: string; url: string | null; version?: string | null }[]>([]);
  const [storeOpen, setStoreOpen] = useState(false);
  const [managerConfigured, setManagerConfigured] = useState<boolean | null>(null);
  const [managerError, setManagerError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/space-apps?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { apps: typeof managed };
      setManaged(data.apps); setManagerConfigured(true);
      setManagerError("");
    } catch {
      setManaged((current) => current.filter((app) => app.id === "excalidraw"));
      setManagerConfigured(false);
      setManagerError("No se pudieron consultar las aplicaciones.");
    }
  }, [projectId]);
  useEffect(() => { const first = window.setTimeout(() => { void refresh(); }, 0); const timer = window.setInterval(() => { void refresh(); }, 10000); return () => { window.clearTimeout(first); window.clearInterval(timer); }; }, [refresh]);
  const manage = async (id: string, action: StoreAction) => {
    if (action === "uninstall" && !window.confirm("Se desinstalará esta aplicación de Tienda para todos los miembros. Las pizarras de las tareas no se ven afectadas. ¿Continuar?")) return;
    try {
      const response = await fetch(`/api/space-apps?project=${encodeURIComponent(projectId)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action }) });
      if (!response.ok) throw new Error();
      await refresh();
    } catch { setManagerError("No se pudo actualizar la aplicación. Inténtalo de nuevo."); }
  };
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const desktopRef = useRef<HTMLDivElement>(null);
  const [desktopSize, setDesktopSize] = useState({ width: 0, height: 0 });
  const zCounter = useRef(10);

  // La ventana vive dentro del contenido de Administración, no en el viewport:
  // observa su caja para mantener las ventanas ampliadas dentro del escritorio.
  useEffect(() => {
    const element = desktopRef.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      setDesktopSize({ width: rect.width, height: rect.height });
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const open = useCallback((tool: StoreTool) => {
    setWindows((current) => {
      const existing = current.find((item) => item.tool.id === tool.id);
      zCounter.current += 1;
      if (existing) {
        return current.map((item) => (item.tool.id === tool.id ? { ...item, minimized: false, zIndex: zCounter.current } : item));
      }
      const preferred = toolWindow(tool.id);
      const rect = desktopRef.current?.getBoundingClientRect();
      const areaWidth = Math.max(280, rect?.width ?? window.innerWidth);
      const areaHeight = Math.max(240, rect?.height ?? window.innerHeight);
      const width = Math.min(preferred.width, Math.max(240, areaWidth - 24));
      const height = Math.min(preferred.height, Math.max(200, areaHeight - 24));
      const offset = Math.max(12, Math.min(150 + current.length * 30, areaWidth - width - 12));
      const position = { x: offset, y: 12 };
      const size = { width, height };
      return [...current, { tool, minimized: false, position, size, maximized: false, zIndex: zCounter.current }];
    });
  }, []);

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
    const rect = desktopRef.current?.getBoundingClientRect();
    return {
      ...item,
      maximized: true,
      saved: { position: item.position, size: item.size },
      position: { x: 0, y: 0 },
      size: { width: rect?.width ?? window.innerWidth, height: rect?.height ?? window.innerHeight },
    };
  }));

  // En el escritorio solo aparecen las apps instaladas (nativas en la DB,
  // según su estado guardado. Una app no instalada no tiene icono: se
  // instala desde Aula Store.
  const installedIds = new Set(managed.filter((app) => app.status === "installed").map((app) => app.id));
  const desktopTools = tools.filter((tool) => installedIds.has(tool.id));
  // Paso A (MCP-04): `view=administracion&section=tienda&app=<appId>` abre esa
  // ventana al cargar. Se lee una sola vez por app y solo si está instalada y
  // visible para el rol; el parámetro queda en la URL y cerrar la ventana no lo toca.
  const openedFromUrl = useRef<string | null>(null);
  useEffect(() => {
    if (managerConfigured !== true) return;
    const appId = parseBoardUrl(window.location.search).app;
    if (!appId || openedFromUrl.current === appId) return;
    const tool = desktopTools.find((item) => item.id === appId);
    if (!tool) return;
    openedFromUrl.current = appId;
    open(tool);
  }, [managerConfigured, desktopTools, open]);
  // Si una app se desinstala, su ventana abierta desaparece (filtro en el
  // render, sin efecto): solo se muestran las de apps instaladas.
  const shownWindows = managerConfigured === null ? windows : windows.filter((item) => installedIds.has(item.tool.id));
  const restore = (id: string) => setWindows((current) => current.map((item) => (item.tool.id === id ? { ...item, minimized: false } : item)));

  // Canal en vivo del escritorio (Fase 2 de MCP-04): publica el estado de
  // las ventanas y ejecuta los comandos que envían las herramientas MCP.
  const { publicarEstado, alComando } = useSpaceSocket(projectId);
  const latest = useRef({ open, close, minimize, restore, zoom, desktopTools });
  useEffect(() => {
    latest.current = { open, close, minimize, restore, zoom, desktopTools };
  });
  useEffect(() => {
    return alComando((cmd) => {
      const state = latest.current;
      const tool = state.desktopTools.find((item) => item.id === cmd.appId);
      if (!tool) return;
      switch (cmd.accion) {
        case "abrir": state.open(tool); break;
        case "cerrar": state.close(cmd.appId); break;
        case "minimizar": state.minimize(cmd.appId); break;
        case "restaurar": state.restore(cmd.appId); break;
        case "ampliar": state.zoom(cmd.appId); break;
      }
    });
  }, [alComando]);
  useEffect(() => {
    publicarEstado(windows.map((item) => ({ appId: item.tool.id, abierta: true, minimizada: item.minimized, ampliada: item.maximized })));
  }, [windows, publicarEstado]);

  return (
    <MotionConfig reducedMotion="user">
    <LazyMotion features={domAnimation}>
    <section className="store-view" aria-label="Tienda">
      <div className="store-desktop" ref={desktopRef} aria-label="Escritorio de aplicaciones">
        {managerError && <p role="alert" className="store-empty">{managerError}</p>}
        {managerConfigured === null ? (
          <p className="store-empty">Cargando aplicaciones…</p>
        ) : !managerError && desktopTools.length === 0 ? (
          <p className="store-empty">Todavía no hay herramientas instaladas. Abre Aula Store para añadirlas.</p>
        ) : null}
        <div className="store-icons">
          {desktopTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.id}>
              <button type="button" className="store-tool" onClick={() => open(tool)} title={tool.description}>
                <span className="store-tool-icon" aria-hidden><Icon size={28} strokeWidth={2} /></span>
                <span className="store-tool-name">{tool.name}</span>
              </button>
              </div>
            );
          })}
        </div>
        <nav className="store-dock" aria-label="Accesos de Tienda">
          {shownWindows.filter((item) => item.minimized).map((item) => {
            const Icon = item.tool.icon;
            return (
              <button key={item.tool.id} type="button" className="store-minimized-icon" title={`${item.tool.name} (minimizada)`} aria-label={`Restaurar ${item.tool.name}`} onClick={() => restore(item.tool.id)}>
                <Icon size={18} strokeWidth={2} />
              </button>
            );
          })}
          <button type="button" className="store-dock-store" onClick={() => setStoreOpen(true)} title="Aula Store: instala o desinstala aplicaciones del catálogo">
            <span className="store-dock-tile" aria-hidden><AulaStoreIcon size={24} /></span>
            <span className="store-dock-name">Aula Store</span>
          </button>
        </nav>
        <AnimatePresence>
        {shownWindows.map((item) => {
          const App = toolApps[item.tool.id];
          return (
            <StoreWindow
              key={item.tool.id}
              title={item.tool.name}
              position={item.maximized ? { x: 0, y: 0 } : item.position}
              size={item.maximized && desktopSize.width && desktopSize.height ? desktopSize : item.size}
              bounds={desktopSize}
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
              {App ? <Suspense fallback={<p className="store-loading">Cargando {item.tool.name}…</p>}><App projectId={projectId} role={role} instanceUrl={managed.find(app => app.id === item.tool.id && app.status === "installed")?.url ?? undefined} /></Suspense> : <p className="store-loading">Próximamente.</p>}
            </StoreWindow>
          );
        })}
        </AnimatePresence>
      </div>
      {storeOpen ? (
        <Suspense fallback={<p className="store-loading">Cargando Aula Store…</p>}>
        <AppsStore
          role={role}
          apps={managed}
          error={managerError}
          onManage={(id, action) => void manage(id, action)}
          onOpen={(tool) => { setStoreOpen(false); open(tool); }}
          onRefresh={() => void refresh()}
          onClose={() => setStoreOpen(false)}
        />
        </Suspense>
      ) : null}
    </section>
    </LazyMotion>
    </MotionConfig>
  );
}
