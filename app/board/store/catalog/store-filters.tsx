"use client";

import { Search } from "lucide-react";
import { STORE_CATEGORIES, type StoreCategory, type StoreTool } from "../tools";

/**
 * Buscador y filtros de categoría/instaladas de Aula Store.
 * @param props - Catálogo, valores activos y acciones de filtrado.
 * @returns La barra de búsqueda y los chips de filtros.
 */
export default function StoreFilters({ tools, query, category, installedOnly, installedCount, onQuery, onCategory, onInstalledOnly }: {
  tools: StoreTool[];
  query: string;
  category: StoreCategory | "todas";
  installedOnly: boolean;
  installedCount: number;
  onQuery: (value: string) => void;
  onCategory: (value: StoreCategory | "todas") => void;
  onInstalledOnly: () => void;
}) {
  return (
    <div className="store-toolbar">
      <label className="store-search">
        <Search size={16} aria-hidden />
        <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar en Aula Store" aria-label="Buscar aplicaciones" />
      </label>
      <div className="store-filters" role="group" aria-label="Filtrar aplicaciones">
        <button type="button" className={`store-filter${category === "todas" && !installedOnly ? " store-filter--active" : ""}`} aria-pressed={category === "todas" && !installedOnly} onClick={() => { onCategory("todas"); if (installedOnly) onInstalledOnly(); }}>
          Todo<span className="store-filter-count">{tools.length}</span>
        </button>
        {STORE_CATEGORIES.map((name) => {
          const count = tools.filter((tool) => tool.category === name).length;
          if (!count) return null;
          return (
            <button key={name} type="button" className={`store-filter${category === name ? " store-filter--active" : ""}`} aria-pressed={category === name} onClick={() => onCategory(name)}>
              {name}<span className="store-filter-count">{count}</span>
            </button>
          );
        })}
        <button type="button" className={`store-filter${installedOnly ? " store-filter--active" : ""}`} aria-pressed={installedOnly} onClick={onInstalledOnly}>
          Instaladas<span className="store-filter-count">{installedCount}</span>
        </button>
      </div>
    </div>
  );
}
