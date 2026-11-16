"use client";

import { Search } from "lucide-react";

/**
 * Buscador y filtro de instaladas de Aula Store. Las categorías se
 * navegan con la barra inferior (STORE-03B).
 * @param props - Valores activos y acciones de filtrado.
 * @returns La barra de búsqueda y el filtro de instaladas.
 */
export default function StoreFilters({ query, installedOnly, installedCount, onQuery, onInstalledOnly }: {
  query: string;
  installedOnly: boolean;
  installedCount: number;
  onQuery: (value: string) => void;
  onInstalledOnly: () => void;
}) {
  return (
    <div className="store-toolbar">
      <label className="store-search">
        <Search size={16} aria-hidden />
        <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar en Aula Store" aria-label="Buscar aplicaciones" />
      </label>
      <div className="store-filters" role="group" aria-label="Filtrar aplicaciones">
        
        <button type="button" className={`store-filter${installedOnly ? " store-filter--active" : ""}`} aria-pressed={installedOnly} onClick={onInstalledOnly}>
          Instaladas<span className="store-filter-count">{installedCount}</span>
        </button>
      </div>
    </div>
  );
}
