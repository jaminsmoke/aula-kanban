"use client";

import { useEffect, useState } from "react";
import type { BoardUrlState } from "./board-url";
import { buildBoardUrl, parseBoardUrl } from "./board-url";

/**
 * Estado de vista y sección del tablero sincronizado con la URL.
 * El estado inicial llega ya parseado desde el servidor (`Page` +
 * `parseBoardUrl`), para que la primera pintura del servidor y la del
 * cliente sean idénticas; en el cliente se escucha `popstate`
 * (atrás/adelante) y cada cambio se escribe con `pushState`, sin
 * recargar. Ver `board-url.ts` para el esquema de claves, defectos y
 * valores inválidos.
 * @param initial - Estado inicial de vista y sección de la URL.
 * @returns Vista, secciones y sus setters.
 */
export function useBoardUrlState(initial?: BoardUrlState) {
  const [view, setView] = useState(initial?.view ?? "clase");
  const [classSection, setClassSection] = useState(initial?.classSection ?? "tareas");
  const [settingsSection, setSettingsSection] = useState(initial?.settingsSection ?? "cuenta");

  useEffect(() => {
    const onPopState = () => {
      const next = parseBoardUrl(window.location.search);
      setView(next.view);
      setClassSection(next.classSection);
      setSettingsSection(next.settingsSection);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const nextSearch = buildBoardUrl(window.location.search, { view, classSection, settingsSection });
    const next = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.pushState(null, "", next);
  }, [view, classSection, settingsSection]);

  return { view, setView, classSection, setClassSection, settingsSection, setSettingsSection };
}
