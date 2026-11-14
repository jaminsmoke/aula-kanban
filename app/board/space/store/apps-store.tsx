"use client";

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import { ArrowLeft, Download, GraduationCap, GitBranch, Info, Package, PencilRuler, Play, Puzzle, RefreshCw, Search, Trash2, TriangleAlert, X } from "lucide-react";
import { SPACE_CATEGORIES, visibleTools, type SpaceCategory, type SpaceRole, type SpaceTool } from "../tools";
import { AulaStoreIcon } from "./aula-store-icon";
import "./store.css";

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

/** Icono de cada categoría del catálogo. */
const CATEGORY_ICONS = {
  Aula: GraduationCap,
  Pizarras: PencilRuler,
  Programación: Puzzle,
  Diagramas: GitBranch,
} as const;

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
 * Catálogo de aplicaciones nativas de Mi espacio, agrupado por categorías y con
 * ficha de detalle.
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
  const [category, setCategory] = useState<SpaceCategory | "todas">("todas");
  const [installedOnly, setInstalledOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Cerrar la ficha con Escape.
  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  const allTools = useMemo(() => visibleTools(role), [role]);
  const statusOf = (id: string) => apps.find((item) => item.id === id)?.status ?? "not_installed";
  const installedCount = allTools.filter((tool) => statusOf(tool.id) === "installed").length;
  const selectedTool = allTools.find((tool) => tool.id === selectedId) ?? null;
  const SelectedIcon = selectedTool?.icon;

  /**
   * ¿Pasa una herramienta el buscador, la categoría y el filtro de instaladas?
   * @param tool - Herramienta del catálogo.
   * @returns `true` si debe mostrarse.
   */
  const matches = (tool: SpaceTool) => {
    if (category !== "todas" && tool.category !== category) return false;
    if (installedOnly && statusOf(tool.id) !== "installed") return false;
    const text = `${tool.name} ${tool.tagline} ${tool.description} ${tool.category}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  };

  const visibleCount = allTools.filter(matches).length;
  const sectionTools = allTools.filter(matches);
  const sectionTitle = category !== "todas" ? category : installedOnly ? "Instaladas" : "Todas las aplicaciones";
  const SectionIcon = category !== "todas" ? CATEGORY_ICONS[category] : Package;

  /**
   * Acciones de una app (abrir, instalar o desinstalar).
   * @param tool - Herramienta del catálogo.
   * @param installed - Si está instalada.
   * @returns Los botones disponibles para el rol actual.
   */
  const actions = (tool: SpaceTool, installed: boolean) => (
    <>
      {installed ? (
        <button type="button" className="store-primary" onClick={() => onOpen(tool)}><Play size={14} aria-hidden /> Abrir</button>
      ) : isAdmin ? (
        <button type="button" className="store-primary" onClick={() => onManage(tool.id, "install")}><Download size={14} aria-hidden /> Instalar</button>
      ) : null}
      {isAdmin && installed ? (
        <button type="button" className="store-secondary" onClick={() => onManage(tool.id, "uninstall")}><Trash2 size={14} aria-hidden /> Desinstalar</button>
      ) : null}
    </>
  );

  /**
   * Tarjeta estándar de una aplicación.
   * @param tool - Herramienta del catálogo.
   * @param index - Posición en la lista (entrada escalonada).
   * @returns La tarjeta de la tienda.
   */
  const nativeCard = (tool: SpaceTool, index: number) => {
    const Icon = tool.icon;
    const installed = statusOf(tool.id) === "installed";
    return (
      <m.article
        layout
        key={tool.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.24, ease: "easeOut", delay: index * 0.04 }}
        className="store-card"
      >
        <button type="button" className="store-card-cover" onClick={() => setSelectedId(tool.id)} aria-label={`Ver detalles de ${tool.name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tool.cover} alt="" loading="lazy" />
          <span className="store-card-icon" aria-hidden><Icon size={22} strokeWidth={2} /></span>
          <span className="store-card-category">{tool.category}</span>
        </button>

        <div className="store-card-body">
          <h3>{tool.name}</h3>
          <p className="store-card-tagline">{tool.tagline}</p>
          <p className="store-meta">
            <span className={`store-chip ${STATUS_META[statusOf(tool.id)]?.className ?? "store-chip--pending"}`}>
              <span className="store-chip-dot" aria-hidden />
              {statusLabel(statusOf(tool.id))}
            </span>
          </p>
        </div>

        <div className="store-card-footer">
          {actions(tool, installed)}
          <button type="button" className="store-secondary store-details" onClick={() => setSelectedId(tool.id)}><Info size={14} aria-hidden /> Detalles</button>
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
      <header className="store-header">
        <div className="store-header-main">
          <button type="button" className="store-back" onClick={onClose}><ArrowLeft size={16} aria-hidden /> Escritorio</button>
          <span className="store-mark" aria-hidden><AulaStoreIcon size={26} /></span>
          <h2 className="store-title">Aula Store</h2>
          <div className="store-stats" aria-label="Resumen de la tienda">
            <span className="store-stat"><strong>{installedCount}</strong> instaladas</span>
            <span className="store-stat"><strong>{allTools.length}</strong> disponibles</span>
          </div>
          <button type="button" className="store-refresh" onClick={onRefresh} title="Actualizar estado"><RefreshCw size={15} aria-hidden /> Actualizar</button>
        </div>
        <div className="store-toolbar">
          <label className="store-search">
            <Search size={17} aria-hidden />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en Aula Store" aria-label="Buscar aplicaciones" />
          </label>
          <div className="store-filters" role="group" aria-label="Filtrar aplicaciones">
            <button type="button" className={`store-filter${category === "todas" && !installedOnly ? " store-filter--active" : ""}`} aria-pressed={category === "todas" && !installedOnly} onClick={() => { setCategory("todas"); setInstalledOnly(false); }}>
              Todo<span className="store-filter-count">{allTools.length}</span>
            </button>
            {SPACE_CATEGORIES.map((name) => {
              const count = allTools.filter((tool) => tool.category === name).length;
              if (!count) return null;
              return (
                <button key={name} type="button" className={`store-filter${category === name ? " store-filter--active" : ""}`} aria-pressed={category === name} onClick={() => setCategory(name)}>
                  {name}<span className="store-filter-count">{count}</span>
                </button>
              );
            })}
            <button type="button" className={`store-filter${installedOnly ? " store-filter--active" : ""}`} aria-pressed={installedOnly} onClick={() => setInstalledOnly((current) => !current)}>
              Instaladas<span className="store-filter-count">{installedCount}</span>
            </button>
          </div>
        </div>
      </header>

      {error ? <p role="alert" className="store-alert"><TriangleAlert size={15} aria-hidden /> {error}</p> : null}

      {visibleCount === 0 ? (
        <p className="store-results-empty">Sin resultados para «{query}».</p>
      ) : (
        <section className="store-section" aria-label={sectionTitle}>
          <h3 className="store-section-title"><SectionIcon size={17} aria-hidden /> {sectionTitle}<span className="store-section-count">{sectionTools.length}</span></h3>
          <div className="store-grid">
            <AnimatePresence mode="popLayout">
              {sectionTools.map(nativeCard)}
            </AnimatePresence>
          </div>
        </section>
      )}

      <p className="store-note"><Package size={14} aria-hidden /> Las aplicaciones nativas son librerías del propio Aula: instalarlas o desinstalarlas de «Mi espacio» solo registra su estado y no borra paquetes ni datos.</p>

      {selectedTool ? (
        <div className="store-detail" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <div className="store-detail-card" role="dialog" aria-modal="true" aria-label={selectedTool.name}>
            <button type="button" className="store-detail-close" aria-label="Cerrar detalles" onClick={() => setSelectedId(null)} autoFocus><X size={18} aria-hidden /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="store-detail-cover" src={selectedTool.cover} alt="" />
            <div className="store-detail-body">
              <div className="store-detail-head">
                <span className="store-card-icon store-card-icon--static" aria-hidden>{SelectedIcon ? <SelectedIcon size={24} strokeWidth={2} /> : null}</span>
                <div className="store-detail-title">
                  <h3>{selectedTool.name}</h3>
                  <p>{selectedTool.category} · {statusLabel(statusOf(selectedTool.id))}</p>
                </div>
              </div>
              <p className="store-detail-description">{selectedTool.description}</p>
              <ul className="store-detail-features">
                {selectedTool.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              {!isAdmin && statusOf(selectedTool.id) !== "installed" ? (
                <p className="store-detail-note">Solo el propietario o un administrador puede instalar aplicaciones.</p>
              ) : null}
              <div className="store-detail-actions">
                {actions(selectedTool, statusOf(selectedTool.id) === "installed")}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </LazyMotion>
    </MotionConfig>
  );
}
