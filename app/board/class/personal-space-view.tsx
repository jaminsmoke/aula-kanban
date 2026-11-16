"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation } from "motion/react";
import StoreWindow from "../store/store-window";
import { storeTools, toolApps } from "../apps/registry";
import { visibleTools, type StoreRole, type StoreTool } from "../store/tools";
import { useDesktopWindows } from "../store/use-desktop-windows";
import "../store/store-desktop.css";

type PersonalAppRow = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  favorite: boolean;
  position: number | null;
};

/**
 * Escritorio personal de la mochila del alumnado y del maletín docente
 * (APP-03): el mismo desktop que Tienda, pero sin tienda — solo los
 * iconos de las apps instaladas, en el orden personal del usuario
 * (favoritas primero, según `/api/personal-apps`), y ventanas que se
 * abren, arrastran, minimizan y amplían igual que en Tienda. El dock
 * solo conserva las ventanas minimizadas: no hay catálogo ni
 * instalación aquí; eso sigue en Aula Store.
 *
 * De momento el escritorio es el mismo para alumnado y profesorado;
 * la organización interna (iconos propios, carpetas) llegará en una
 * iteración posterior.
 * @param props - Rol en el proyecto activo y proyecto.
 * @returns El escritorio personal dentro de Clase.
 */
export default function PersonalSpaceView({ role, projectId }: {
  role: StoreRole;
  projectId: string;
}) {
  const [apps, setApps] = useState<PersonalAppRow[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const title = role === "teacher" ? "Maletín docente" : "Mi mochila";
  const { desktopRef, desktopSize, windows, open, focus, close, minimize, restore, move, resize, zoom } = useDesktopWindows();

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/personal-apps?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { apps: PersonalAppRow[] };
      setApps(data.apps);
      setConfigured(true);
      setError("");
    } catch {
      setConfigured(false);
      setError("No se pudieron consultar tus herramientas.");
    }
  }, [projectId]);

  useEffect(() => {
    const first = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { void refresh(); }, 10000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [refresh]);

  // Solo las herramientas visibles para el rol, en el orden personal que
  // devuelve el servidor (favoritas primero).
  const visibleIds = new Set(visibleTools(role).map((tool) => tool.id));
  const desktopTools: StoreTool[] = apps
    .filter((app) => visibleIds.has(app.id))
    .map((app) => storeTools.find((tool) => tool.id === app.id))
    .filter((tool): tool is StoreTool => Boolean(tool));
  const desktopIds = new Set(desktopTools.map((tool) => tool.id));
  const shownWindows = configured === null ? windows : windows.filter((item) => desktopIds.has(item.tool.id));

  return (
    <MotionConfig reducedMotion="user">
    <LazyMotion features={domAnimation}>
    <section className="store-view" aria-label={title}>
      <div className="store-desktop" ref={desktopRef} aria-label="Escritorio personal">
        {error && <p role="alert" className="store-empty">{error}{" "}<button type="button" className="text-button" onClick={() => void refresh()}>Reintentar</button></p>}
        {configured === null ? (
          <p className="store-empty">Cargando tus herramientas…</p>
        ) : !error && desktopTools.length === 0 ? (
          <p className="store-empty">Todavía no hay herramientas instaladas en esta instancia.</p>
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
        <nav className="store-dock" aria-label="Ventanas minimizadas">
          {shownWindows.filter((item) => item.minimized).map((item) => {
            const Icon = item.tool.icon;
            return (
              <button key={item.tool.id} type="button" className="store-minimized-icon" title={`${item.tool.name} (minimizada)`} aria-label={`Restaurar ${item.tool.name}`} onClick={() => restore(item.tool.id)}>
                <Icon size={18} strokeWidth={2} />
              </button>
            );
          })}
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
              {App ? <Suspense fallback={<p className="store-loading">Cargando {item.tool.name}…</p>}><App projectId={projectId} role={role} /></Suspense> : <p className="store-loading">Próximamente.</p>}
            </StoreWindow>
          );
        })}
        </AnimatePresence>
      </div>
    </section>
    </LazyMotion>
    </MotionConfig>
  );
}
