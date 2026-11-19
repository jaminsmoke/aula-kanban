"use client";

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation } from "motion/react";
import StoreWindow from "./store-window";
import type { StoreAction } from "./catalog/apps-store";
import { AulaStoreIcon } from "./catalog/aula-store-icon";

// La tienda solo se descarga al abrirla.
const AppsStore = lazy(() => import("./catalog/apps-store"));
import { visibleTools, type StoreRole } from "./tools";
import { LEGACY_DOCUMENT_APP_ALIASES, resolveAppRouteId } from "../../../lib/native-apps";
import { parseBoardUrl } from "../shared/board-url";
import { useSpaceSocket } from "./use-space-socket";
import { toolApps } from "../apps/registry";
import { useDesktopWindows } from "./use-desktop-windows";
import "./store-desktop.css";

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
  const { desktopRef, desktopSize, windows, open, focus, close, minimize, restore, move, resize, zoom } = useDesktopWindows();

  // En el escritorio solo aparecen las apps instaladas (nativas en la DB,
  // según su estado guardado. Una app no instalada no tiene icono: se
  // instala desde Aula Store.
  const installedIds = new Set(managed.filter((app) => app.status === "installed").map((app) => app.id));
  const desktopTools = tools.filter((tool) => installedIds.has(tool.id));
  // Paso A (MCP-04): `view=administracion&section=tienda&app=<appId>` abre esa
  // ventana al cargar. Se lee una sola vez por app y solo si está instalada y
  // visible para el rol; el parámetro queda en la URL y cerrar la ventana no lo toca.
  const openedFromUrl = useRef<string | null>(null);
  const [legacyDocumentWindow, setLegacyDocumentWindow] = useState(() => {
    if (typeof window === "undefined") return false;
    const rawAppId = new URLSearchParams(window.location.search).get("app");
    return rawAppId !== null && rawAppId in LEGACY_DOCUMENT_APP_ALIASES;
  });
  useEffect(() => {
    if (managerConfigured !== true) return;
    const appId = parseBoardUrl(window.location.search).app;
    if (!appId || openedFromUrl.current === appId) return;
    const rawAppId = new URLSearchParams(window.location.search).get("app");
    const legacyDocumentLink = rawAppId !== null && rawAppId in LEGACY_DOCUMENT_APP_ALIASES;
    const installedTool = desktopTools.find((item) => item.id === appId);
    const tool = installedTool
      ?? (legacyDocumentLink ? tools.find((item) => item.id === appId) : undefined);
    if (!tool) return;
    openedFromUrl.current = appId;
    open(tool);
  }, [managerConfigured, desktopTools, open, tools]);
  // Si una app se desinstala, su ventana abierta desaparece (filtro en el
  // render, sin efecto): solo se muestran las de apps instaladas.
  const shownWindows = managerConfigured === null
    ? windows
    : windows.filter((item) => installedIds.has(item.tool.id)
      || (legacyDocumentWindow && item.tool.id === "aula-documentos"));

  // Canal en vivo del escritorio (Fase 2 de MCP-04): publica el estado de
  // las ventanas y ejecuta los comandos que envían las herramientas MCP.
  const { publicarEstado, alComando } = useSpaceSocket(projectId);
  const latest = useRef({ open, close, minimize, restore, zoom, desktopTools, tools });
  useEffect(() => {
    latest.current = { open, close, minimize, restore, zoom, desktopTools, tools };
  });
  useEffect(() => {
    return alComando((cmd) => {
      const state = latest.current;
      const appId = resolveAppRouteId(cmd.appId);
      const legacyDocumentCommand = cmd.appId in LEGACY_DOCUMENT_APP_ALIASES;
      const installedTool = state.desktopTools.find((item) => item.id === appId);
      const tool = installedTool
        ?? (legacyDocumentCommand ? state.tools.find((item) => item.id === appId) : undefined);
      if (!tool) return;
      if (!installedTool) setLegacyDocumentWindow(true);
      switch (cmd.accion) {
        case "abrir": state.open(tool); break;
        case "cerrar": state.close(appId); break;
        case "minimizar": state.minimize(appId); break;
        case "restaurar": state.restore(appId); break;
        case "ampliar": state.zoom(appId); break;
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
