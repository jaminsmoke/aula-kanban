"use client";

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import { ArrowLeft, Download, Eraser, LoaderCircle, Package, Play, RefreshCw, Search, Server, Trash2, TriangleAlert } from "lucide-react";
import Modal from "../modal";
import { visibleTools, type SpaceRole, type SpaceTool } from "./tools";
import { AulaStoreIcon } from "./aula-store-icon";

/** Lottie solo para el check de instalación: chunk aparte, cargado con lazy. */
const StoreLottie = lazy(() => import("./store-lottie"));

/** Estado de una aplicación (VPS o nativa) tal como lo devuelve la API. */
export type StoreApp = {
  /** Identificador en el catálogo (`nodum`, `affine`, `excalidraw`). */
  id: string;
  /** Estado: instalada, detenida, no instalada, en curso o error. */
  status: string;
  /** URL pública de la instancia, si está instalada. */
  url: string | null;
  /** Versión de la imagen en Docker (VPS) o del paquete (nativa), si se conoce. */
  version?: string | null;
};

/** Acciones de gestión disponibles en la tienda. */
export type StoreAction = "install" | "uninstall" | "reset";

/** Filtros de la tienda (chips estilo Play Store). */
type StoreFilter = "all" | "vps" | "site" | "installed";

const STATUS_META: Record<string, { label: string; className: string }> = {
  installed: { label: "Instalada", className: "store-chip--installed" },
  stopped: { label: "Detenida", className: "store-chip--stopped" },
  not_installed: { label: "No instalada", className: "store-chip--pending" },
  working: { label: "Procesando…", className: "store-chip--working" },
  error: { label: "Error", className: "store-chip--error" },
};

/**
 * Etiqueta legible de un estado de aplicación.
 * @param status - Estado bruto de la aplicación.
 * @returns La etiqueta para mostrar.
 */
function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status;
}

/**
 * Aula Store de «Mi espacio»: catálogo al estilo Play Store con cabecera,
 * buscador y chips de categoría («Aplicaciones VPS», «Aplicaciones
 * nativas», «Instaladas»). «Aplicaciones VPS» muestra el estado real en
 * Docker del VPS (instalada, versión) con instalar / desinstalar /
 * resetear (borrar volúmenes y datos). «Aplicaciones nativas» son
 * librerías del propio Site (Excalidraw): instalar o desinstalar aquí
 * solo registra el estado en la DB, sin tocar `package.json`. Solo el
 * propietario y los administradores gestionan; el resto ve el estado y
 * puede abrir. El movimiento es CSS puro (tokens de `globals.css`), sin
 * librerías de animación.
 * @param props - Rol, estado del gestor, aplicaciones, errores y callbacks.
 * @returns La tienda a pantalla completa sobre el escritorio.
 */
export default function AppsStore({ role, configured, apps, error, onManage, onOpen, onRefresh, onShowGuide, onClose }: {
  role: SpaceRole;
  configured: boolean | null;
  apps: StoreApp[];
  error: string;
  onManage: (id: string, action: StoreAction) => void;
  onOpen: (tool: SpaceTool) => void;
  onRefresh: () => void;
  onShowGuide: () => void;
  onClose: () => void;
}) {
  const isAdmin = role === "owner" || role === "admin";
  const [resetTarget, setResetTarget] = useState<SpaceTool | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StoreFilter>("all");
  const [justInstalled, setJustInstalled] = useState<string | null>(null);
  const prevStatuses = useRef<Map<string, string>>(new Map());

  // Al pasar una app a «instalada», mostrar el check Lottie unos instantes.
  useEffect(() => {
    const next = apps.find((app) => prevStatuses.current.get(app.id) !== "installed" && app.status === "installed");
    prevStatuses.current = new Map(apps.map((app) => [app.id, app.status]));
    if (!next) return;
    const timer = setTimeout(() => setJustInstalled(next.id), 0);
    return () => clearTimeout(timer);
  }, [apps]);
  useEffect(() => {
    if (!justInstalled) return;
    const timer = setTimeout(() => setJustInstalled(null), 1900);
    return () => clearTimeout(timer);
  }, [justInstalled]);

  const allTools = useMemo(() => visibleTools(role), [role]);
  const statusOf = (id: string) => apps.find((item) => item.id === id)?.status ?? "not_installed";
  const installedCount = allTools.filter((tool) => statusOf(tool.id) === "installed").length;
  const firstInstalledId = allTools.find((tool) => statusOf(tool.id) === "installed")?.id;

  /**
   * ¿Pasa una herramienta el buscador y el chip activo?
   * @param tool - Herramienta del catálogo.
   * @returns `true` si coincide con la búsqueda y el filtro.
   */
  const matches = (tool: SpaceTool) => {
    const text = `${tool.name} ${tool.description}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (filter !== "installed" || statusOf(tool.id) === "installed");
  };

  const showVps = filter !== "site";
  const showNative = filter !== "vps";
  const vpsTools = showVps ? allTools.filter((tool) => tool.host === "vps" && matches(tool)) : [];
  const nativeTools = showNative ? allTools.filter((tool) => tool.host === "site" && matches(tool)) : [];

  const filters: { id: StoreFilter; label: string; count: number }[] = [
    { id: "all", label: "Todo", count: allTools.length },
    { id: "vps", label: "VPS", count: allTools.filter((tool) => tool.host === "vps").length },
    { id: "site", label: "Nativas", count: allTools.filter((tool) => tool.host === "site").length },
    { id: "installed", label: "Instaladas", count: installedCount },
  ];

  /**
   * Tarjeta de una aplicación del VPS con sus acciones de gestión.
   * @param tool - Herramienta del catálogo.
   * @param index - Posición en la lista (para la entrada escalonada).
   * @returns La tarjeta de la tienda.
   */
  const vpsCard = (tool: SpaceTool, index: number) => {
    const Icon = tool.icon;
    const app = apps.find((item) => item.id === tool.id);
    const status = app?.status ?? "not_installed";
    const busy = status === "working";
    const manageable = status === "installed" || status === "stopped" || status === "error";
    return (
      <m.article
        key={tool.id}
        layout
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.24, ease: "easeOut", delay: index * 0.05 }}
        whileHover={{ y: -3 }}
        className={`store-card${tool.id === firstInstalledId ? " store-card--featured" : ""}`}
      >
        <span className={`store-app-icon store-app-icon--${tool.id}`} aria-hidden><Icon size={38} strokeWidth={1.9} /></span>
        <div className="store-card-body">
          <h3>{tool.name}</h3>
          <p>{tool.description}</p>
          <p className="store-meta">
            <span className={`store-chip ${STATUS_META[status]?.className ?? "store-chip--pending"}`}>
              <span className="store-chip-dot" aria-hidden />
              {busy ? <LoaderCircle size={11} className="store-spin" aria-hidden /> : null}{statusLabel(status)}
            </span>
            {app?.version ? <span className="store-version">v{app.version}</span> : null}
          </p>
        </div>
        <div className="store-actions">
          {status === "installed" ? (
            <button type="button" className="store-primary" onClick={() => onOpen(tool)}><Play size={14} aria-hidden /> Abrir</button>
          ) : isAdmin && !busy ? (
            <button type="button" className="store-primary" onClick={() => onManage(tool.id, "install")}>
              {status === "not_installed" ? <><Download size={14} aria-hidden /> Instalar</> : status === "error" ? <><RefreshCw size={14} aria-hidden /> Reintentar</> : <><Play size={14} aria-hidden /> Iniciar</>}
            </button>
          ) : null}
          {isAdmin && manageable ? (
            <>
              <button type="button" className="store-secondary" disabled={busy} onClick={() => onManage(tool.id, "uninstall")}><Trash2 size={14} aria-hidden /> Desinstalar</button>
              <button type="button" className="store-secondary store-danger" disabled={busy} onClick={() => setResetTarget(tool)}><Eraser size={14} aria-hidden /> Resetear</button>
            </>
          ) : null}
        </div>
        {busy ? <div className="store-progress" role="progressbar" aria-label={`Procesando ${tool.name}`}><span /></div> : null}
        <AnimatePresence>
          {justInstalled === tool.id ? (
            <m.div className="store-success" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <span className="store-success-lottie"><Suspense fallback={null}><StoreLottie /></Suspense></span>
            </m.div>
          ) : null}
        </AnimatePresence>
      </m.article>
    );
  };

  /**
   * Tarjeta de una aplicación nativa (librería del propio Site).
   * @param tool - Herramienta del catálogo.
   * @param index - Posición en la lista (para la entrada escalonada).
   * @returns La tarjeta de la tienda.
   */
  const nativeCard = (tool: SpaceTool, index: number) => {
    const Icon = tool.icon;
    const app = apps.find((item) => item.id === tool.id);
    const installed = app?.status === "installed";
    return (
      <m.article
        key={tool.id}
        layout
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.24, ease: "easeOut", delay: index * 0.05 }}
        whileHover={{ y: -3 }}
        className={`store-card${tool.id === firstInstalledId ? " store-card--featured" : ""}`}
      >
        <span className={`store-app-icon store-app-icon--${tool.id}`} aria-hidden><Icon size={38} strokeWidth={1.9} /></span>
        <div className="store-card-body">
          <h3>{tool.name}</h3>
          <p>{tool.description}</p>
          <p className="store-meta">
            <span className={`store-chip ${installed ? "store-chip--installed" : "store-chip--pending"}`}>
              <span className="store-chip-dot" aria-hidden />
              {statusLabel(app?.status ?? "not_installed")}
            </span>
          </p>
        </div>
        <div className="store-actions">
          {installed ? (
            <button type="button" className="store-primary" onClick={() => onOpen(tool)}><Play size={14} aria-hidden /> Abrir</button>
          ) : isAdmin ? (
            <button type="button" className="store-primary" onClick={() => onManage(tool.id, "install")}><Download size={14} aria-hidden /> Instalar</button>
          ) : null}
          {isAdmin && installed ? (
            <button type="button" className="store-secondary" onClick={() => onManage(tool.id, "uninstall")}><Trash2 size={14} aria-hidden /> Desinstalar</button>
          ) : null}
        </div>
        <AnimatePresence>
          {justInstalled === tool.id ? (
            <m.div className="store-success" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <span className="store-success-lottie"><Suspense fallback={null}><StoreLottie /></Suspense></span>
            </m.div>
          ) : null}
        </AnimatePresence>
      </m.article>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
    <LazyMotion features={domAnimation}>
    <div className="store-view" role="region" aria-label="Aula Store">
      <header className="store-hero">
        <div className="store-hero-top">
          <button type="button" className="store-back" onClick={onClose}><ArrowLeft size={16} aria-hidden /> Escritorio</button>
          <button type="button" className="store-refresh" onClick={onRefresh} title="Actualizar estado"><RefreshCw size={16} aria-hidden /> Actualizar</button>
        </div>
        <div className="store-hero-main">
          <span className="store-logo" aria-hidden><AulaStoreIcon size={54} /></span>
          <div className="store-heading">
            <h2>Aula Store</h2>
            <p>Catálogo de Aula Kanban: instala, desinstala o resetea cada aplicación.</p>
          </div>
          <div className="store-stats" aria-label="Resumen de la tienda">
            <span className="store-stat"><strong>{installedCount}</strong> instaladas</span>
            <span className="store-stat">{configured === null ? "VPS consultando…" : configured ? "VPS conectado" : "VPS sin conectar"}</span>
          </div>
        </div>
        <label className="store-search">
          <Search size={17} aria-hidden />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en Aula Store" aria-label="Buscar aplicaciones" />
        </label>
        <div className="store-filters" role="group" aria-label="Filtrar aplicaciones">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              className={`store-filter${filter === item.id ? " store-filter--active" : ""}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}<span className="store-filter-count">{item.count}</span>
            </button>
          ))}
        </div>
      </header>

      {error ? <p role="alert" className="store-alert"><TriangleAlert size={15} aria-hidden /> {error}</p> : null}

      <section className="store-section" aria-label="Aplicaciones VPS" hidden={!showVps}>
        <h3 className="store-section-title"><Server size={17} aria-hidden /> Aplicaciones VPS<span className="store-section-count">{vpsTools.length}</span></h3>
        {configured === null ? (
          <>
            <p className="store-empty"><LoaderCircle size={18} className="store-spin" aria-hidden /> Consultando el gestor del VPS…</p>
            <div className="store-grid" aria-hidden="true">
              <div className="store-skeleton" />
              <div className="store-skeleton" />
            </div>
          </>
        ) : configured === false ? (
          <div className="store-empty">
            <span className="store-empty-icon" aria-hidden><Server size={26} /></span>
            <p><strong>El gestor del VPS no está conectado todavía.</strong> Las aplicaciones del VPS aún no se pueden instalar ni gestionar desde aquí.</p>
            {isAdmin ? <button type="button" className="store-primary" onClick={onShowGuide}>Cómo configurar el VPS</button> : null}
          </div>
        ) : vpsTools.length === 0 ? (
          <p className="store-results-empty">Sin resultados para «{query}».</p>
        ) : (
          <div className="store-grid">
            <AnimatePresence mode="popLayout">
              {vpsTools.map(vpsCard)}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section className="store-section" aria-label="Aplicaciones nativas" hidden={!showNative}>
        <h3 className="store-section-title"><Package size={17} aria-hidden /> Aplicaciones nativas<span className="store-section-count">{nativeTools.length}</span></h3>
        {nativeTools.length === 0 ? (
          <p className="store-results-empty">Sin resultados para «{query}».</p>
        ) : (
          <div className="store-grid">
            <AnimatePresence mode="popLayout">
              {nativeTools.map(nativeCard)}
            </AnimatePresence>
          </div>
        )}
        <p className="store-note">Las aplicaciones nativas son librerías del propio Aula: instalarlas o desinstalarlas de «Mi espacio» solo registra su estado y no borra paquetes ni datos. Excalidraw sigue alimentando la pizarra de las tareas.</p>
      </section>

      {resetTarget ? (
        <Modal title={`Resetear ${resetTarget.name}`} onClose={() => setResetTarget(null)}>
          <div className="share-content">
            <p><TriangleAlert size={15} aria-hidden /> Se detendrá <strong>{resetTarget.name}</strong> y se <strong>eliminarán sus volúmenes y datos</strong> (notas, documentos y cuentas) para todos los proyectos de esta instancia. No se puede deshacer.</p>
            <p>¿Seguro que quieres continuar?</p>
            <div className="remix-controls">
              <button type="button" className="secondary" onClick={() => setResetTarget(null)}>Cancelar</button>
              <button type="button" className="primary store-confirm-reset" onClick={() => { onManage(resetTarget.id, "reset"); setResetTarget(null); }}>Sí, borrar datos</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
    </LazyMotion>
    </MotionConfig>
  );
}
