"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { ArrowLeft, Download, Package, Play, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { visibleTools, type SpaceCategory, type SpaceRole, type SpaceTool } from "../tools";
import { AulaStoreIcon } from "./aula-store-icon";
import StoreCard from "./store-card";
import StoreDetail from "./store-detail";
import StoreFilters from "./store-filters";
import { CATEGORY_ICONS, type StoreAction, type StoreApp } from "./store-model";
import "./store.css";

export type { StoreAction, StoreApp } from "./store-model";

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
        <StoreFilters
          tools={allTools}
          query={query}
          category={category}
          installedOnly={installedOnly}
          installedCount={installedCount}
          onQuery={setQuery}
          onCategory={setCategory}
          onInstalledOnly={() => setInstalledOnly((current) => !current)}
        />
      </header>

      {error ? <p role="alert" className="store-alert"><TriangleAlert size={15} aria-hidden /> {error}</p> : null}

      {visibleCount === 0 ? (
        <p className="store-results-empty">Sin resultados para «{query}».</p>
      ) : (
        <section className="store-section" aria-label={sectionTitle}>
          <h3 className="store-section-title"><SectionIcon size={17} aria-hidden /> {sectionTitle}<span className="store-section-count">{sectionTools.length}</span></h3>
          <div className="store-grid">
            <AnimatePresence mode="popLayout">
              {sectionTools.map((tool, index) => {
                const status = statusOf(tool.id);
                return (
                  <StoreCard
                    key={tool.id}
                    tool={tool}
                    index={index}
                    status={status}
                    justInstalled={justInstalled === tool.id}
                    actions={actions(tool, status === "installed")}
                    onDetails={() => setSelectedId(tool.id)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}

      <p className="store-note"><Package size={14} aria-hidden /> Las aplicaciones nativas son librerías del propio Aula: instalarlas o desinstalarlas de «Mi espacio» solo registra su estado y no borra paquetes ni datos.</p>

      {selectedTool ? (
        <StoreDetail
          tool={selectedTool}
          status={statusOf(selectedTool.id)}
          isAdmin={isAdmin}
          actions={actions(selectedTool, statusOf(selectedTool.id) === "installed")}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
    </LazyMotion>
    </MotionConfig>
  );
}
