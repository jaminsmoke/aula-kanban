"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardUrlState } from "./board-url";
import { buildBoardUrl, parseBoardUrl } from "./board-url";

/**
 * Estado de vista y sección del tablero sincronizado con la URL.
 * El estado inicial llega ya parseado desde el servidor (`Page` +
 * `parseBoardUrl`), para que la primera pintura del servidor y la del
 * cliente sean idénticas; en el cliente se escucha `popstate`
 * (atrás/adelante) y cada cambio se escribe con `pushState`, sin
 * recargar. La primera escritura corrige con `replaceState` una URL
 * antigua (`view=alumnos`, `view=profesores`, `view=espacio`) sin añadir
 * historial.
 * Ver `board-url.ts` para el esquema de claves, defectos y valores
 * inválidos.
 * @param initial - Estado inicial de vista y sección de la URL.
 * @returns Vista, secciones y sus setters.
 */
export function useBoardUrlState(initial?: BoardUrlState) {
  const [view, setView] = useState(initial?.view ?? "clase");
  const [classSection, setClassSection] = useState(initial?.classSection ?? "tareas");
  const [settingsSection, setSettingsSection] = useState(initial?.settingsSection ?? "cuenta");
  const [administracionSection, setAdministracionSection] = useState(initial?.administracionSection ?? "alumnos");
  const [app, setApp] = useState(initial?.app ?? null);
  const canonized = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      const next = parseBoardUrl(window.location.search);
      setView(next.view);
      setClassSection(next.classSection);
      setSettingsSection(next.settingsSection);
      setAdministracionSection(next.administracionSection);
      setApp(next.app ?? null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const nextSearch = buildBoardUrl(window.location.search, { view, classSection, settingsSection, administracionSection, app });
    const next = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) {
      if (canonized.current) window.history.pushState(null, "", next);
      else window.history.replaceState(null, "", next);
    }
    canonized.current = true;
  }, [view, classSection, settingsSection, administracionSection, app]);

  return {
    view, setView,
    classSection, setClassSection,
    settingsSection, setSettingsSection,
    administracionSection, setAdministracionSection,
    app, setApp,
  };
}
