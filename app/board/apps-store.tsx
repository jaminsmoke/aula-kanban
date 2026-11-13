"use client";

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import { ArrowLeft, Download, Package, Play, RefreshCw, Search, Trash2, TriangleAlert } from "lucide-react";
import { visibleTools, type SpaceRole, type SpaceTool } from "./tools";
import { AulaStoreIcon } from "./aula-store-icon";

/** Lottie solo para el check de instalación: chunk aparte, cargado con lazy. */
const StoreLottie = lazy(() => import("./store-lottie"));

/** Estado de una aplicación nativa tal como lo devuelve la API. */
export type StoreApp = {
  /** Identificador en el catálogo. */
  id: string;
  /** Estado: instalada, detenida, no instalada, en curso o error. */
  status: string;
  /** URL pública de la instancia, si está instalada. */
  url: string | null;
  /** Versión de la aplicación, si se conoce. */
  version?: string | null;
};

/** Acciones de gestión disponibles en la tienda. */
export type StoreAction = "install" | "uninstall";

/** Filtros de la tienda (chips estilo Play Store). */
type StoreFilter = "all" | "installed";

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
 * Catálogo de aplicaciones nativas de Mi espacio.
 * @returns La tienda de aplicaciones.
 */
export default function AppsStore({ role, apps, error, onManage, onOpen, onRefresh, onClose }: {
  role: SpaceRole;
  apps: StoreApp[];
  error: string;
  onManage: (id: string, action: StoreAction) => void;
  onOpen: (tool: SpaceTool) => void;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const isAdmin = role === "owner" || role === "admin";
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

  const nativeTools = allTools.filter(matches);

  const filters: { id: StoreFilter; label: string; count: number }[] = [
    { id: "all", label: "Todo", count: allTools.length },
    { id: "installed", label: "Instaladas", count: installedCount },
  ];

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
          <span className="store-logo" aria-hidden><AulaStoreIcon size={36} /></span>
          <div className="store-heading">
            <h2>Aula Store</h2>
            <p>Catálogo de Aula Kanban: instala y abre aplicaciones para tu proyecto.</p>
          </div>
          <div className="store-stats" aria-label="Resumen de la tienda">
            <span className="store-stat"><strong>{installedCount}</strong> instaladas</span>
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

      <section className="store-section" aria-label="Aplicaciones nativas">
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

    </div>
    </LazyMotion>
    </MotionConfig>
  );
}
