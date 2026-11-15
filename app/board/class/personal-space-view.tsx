"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { storeTools } from "../apps/registry";
import type { StoreRole } from "../store/tools";
import "./personal-space.css";

type PersonalAppRow = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  favorite: boolean;
  position: number | null;
};

/**
 * Espacio personal del alumnado y del profesorado (APP-03): la mochila
 * y el maletín son una única capa de organización sobre las apps
 * instaladas — favoritos y orden de presentación — que nunca instala
 * ni desinstala nada. La instalación global sigue en Aula Store.
 *
 * Los documentos de trabajo (Blockly, Diagramas, pizarras) se siguen
 * compartiendo con el proyecto: la mochila solo organiza herramientas,
 * no aísla el trabajo de cada usuario.
 * @param props - Rol en el proyecto activo, proyecto y apertura de apps.
 * @returns La vista del espacio personal dentro de Clase.
 */
export default function PersonalSpaceView({ role, projectId, onOpenApp }: {
  role: StoreRole;
  projectId: string;
  onOpenApp: (appId: string) => void;
}) {
  const [apps, setApps] = useState<PersonalAppRow[]>([]);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const title = role === "teacher" ? "Maletín docente" : "Mi mochila";

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
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const save = useCallback(async (next: PersonalAppRow[]) => {
    setApps(next);
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/personal-apps?project=${encodeURIComponent(projectId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: next.map((item, index) => ({ id: item.id, favorite: item.favorite, position: index })),
        }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { apps: PersonalAppRow[] };
      setApps(data.apps);
    } catch {
      setError("No se pudieron guardar tus herramientas. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  const toggleFavorite = (id: string) => {
    void save(apps.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item)));
  };

  const move = (id: string, direction: -1 | 1) => {
    const index = apps.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= apps.length) return;
    if (apps[index].favorite !== apps[target].favorite) return;
    const next = [...apps];
    [next[index], next[target]] = [next[target], next[index]];
    void save(next);
  };

  const favorites = apps.filter((item) => item.favorite);
  const rest = apps.filter((item) => !item.favorite);

  const renderRow = (item: PersonalAppRow, group: readonly PersonalAppRow[]) => {
    const tool = storeTools.find((entry) => entry.id === item.id);
    const Icon = tool?.icon;
    const index = group.findIndex((entry) => entry.id === item.id);
    return (
      <li key={item.id} className="personal-row">
        <span className="personal-icon" aria-hidden>{Icon ? <Icon size={24} strokeWidth={2} /> : null}</span>
        <span className="personal-info">
          <strong>{item.name}</strong>
          <small>{item.tagline}</small>
        </span>
        <span className="personal-actions">
          <button type="button" className="secondary" onClick={() => onOpenApp(item.id)}>Abrir</button>
          <button
            type="button"
            className={`icon-button${item.favorite ? " personal-favorite-active" : ""}`}
            aria-pressed={item.favorite}
            aria-label={item.favorite ? `Quitar ${item.name} de favoritos` : `Añadir ${item.name} a favoritos`}
            title={item.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            onClick={() => toggleFavorite(item.id)}
          >
            <Star size={18} aria-hidden />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Subir ${item.name}`}
            disabled={index <= 0}
            onClick={() => move(item.id, -1)}
          >
            <ChevronUp size={18} aria-hidden />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Bajar ${item.name}`}
            disabled={index >= group.length - 1}
            onClick={() => move(item.id, 1)}
          >
            <ChevronDown size={18} aria-hidden />
          </button>
        </span>
      </li>
    );
  };

  return (
    <section className="personal-space" aria-label={title}>
      <header className="personal-header">
        <h2>{title}</h2>
        <p>Organiza tus herramientas favoritas en este proyecto. Esto no instala ni desinstala nada: las aplicaciones se gestionan en Aula Store.</p>
        <p className="personal-note">Los documentos de trabajo se comparten con el proyecto; tu mochila solo organiza tus herramientas.</p>
      </header>
      {error && <p role="alert" className="personal-error">{error}{" "}<button type="button" className="text-button" onClick={() => void refresh()}>Reintentar</button></p>}
      {saving && <p role="status" className="personal-saving">Guardando…</p>}
      {!configured && !error ? (
        <p className="personal-empty">Cargando tus herramientas…</p>
      ) : configured && apps.length === 0 ? (
        <p className="personal-empty">Todavía no hay herramientas instaladas en esta instancia.</p>
      ) : (
        <>
          <h3 className="personal-group-title">Favoritas</h3>
          {favorites.length === 0 ? (
            <p className="personal-empty">Sin favoritas todavía. Añade una con la estrella.</p>
          ) : (
            <ul className="personal-list">{favorites.map((item) => renderRow(item, favorites))}</ul>
          )}
          <h3 className="personal-group-title">Todas las disponibles</h3>
          <ul className="personal-list">{rest.map((item) => renderRow(item, rest))}</ul>
        </>
      )}
    </section>
  );
}
