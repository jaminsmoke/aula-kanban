import type { BoardView } from "../layout/header";
import type { ClassSection } from "../class/class-view";
import type { SettingsSection } from "../settings/settings-view";

/**
 * Esquema de URL del tablero (Fase 1 del roadmap de URLs por vista y sección).
 *
 * - `project`: id del proyecto activo. Lo sigue leyendo `use-projects`; aquí
 *   solo se conserva, nunca se reescribe.
 * - `view`: una de `clase | alumnos | profesores | espacio | ajustes |
 *   documentacion`. Por defecto `clase`.
 * - `section`: sección dentro de la vista. En `clase` es `tareas` (por
 *   defecto) o `calendario`; en `ajustes` es `cuenta | administradores` (por
 *   defecto `cuenta`). En el resto de vistas no tiene significado y se omite.
 *
 * La forma canónica omite los valores por defecto: `/?project=p1` ya es
 * Clase > Tareas y `/?project=p1&view=ajustes` ya es Ajustes > Cuenta.
 * Los valores inválidos caen al defecto de su vista. Los parámetros
 * desconocidos y el hash (`#docs-…`) se conservan tal cual.
 */

/** Vistas válidas del tablero. */
export const BOARD_VIEWS: readonly BoardView[] = [
  "clase",
  "alumnos",
  "profesores",
  "espacio",
  "ajustes",
  "documentacion",
];

/** Estado de vista y sección derivado de la URL. */
export type BoardUrlState = {
  view: BoardView;
  classSection: ClassSection;
  settingsSection: SettingsSection;
};

/** Secciones válidas dentro de Clase. */
export const CLASS_SECTIONS: readonly ClassSection[] = ["tareas", "calendario"];

const DEFAULT_STATE: BoardUrlState = {
  view: "clase",
  classSection: "tareas",
  settingsSection: "cuenta",
};

/**
 * Lee vista y sección de una query string, con defectos y valores inválidos resueltos.
 * @param search - Query string, con o sin `?` inicial.
 * @returns El estado canónico de vista y sección.
 */
export function parseBoardUrl(search: string): BoardUrlState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const rawView = params.get("view");
  const view: BoardView = BOARD_VIEWS.includes(rawView as BoardView)
    ? (rawView as BoardView)
    : DEFAULT_STATE.view;
  const rawSection = params.get("section");

  const classSection: ClassSection = CLASS_SECTIONS.includes(rawSection as ClassSection)
    ? (rawSection as ClassSection)
    : DEFAULT_STATE.classSection;
  const settingsSection: SettingsSection =
    rawSection === "administradores" || rawSection === "cuenta"
      ? rawSection
      : DEFAULT_STATE.settingsSection;

  return { view, classSection, settingsSection };
}

/**
 * Construye la query canónica para un estado, conservando `project` y
 * cualquier parámetro desconocido ya presente en la URL.
 * @param search - Query string actual, con o sin `?` inicial.
 * @param state - Estado de vista y sección a reflejar en la URL.
 * @returns La nueva query string, con `?` inicial o cadena vacía si no hay parámetros.
 */
export function buildBoardUrl(search: string, state: BoardUrlState): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  if (state.view === DEFAULT_STATE.view) params.delete("view");
  else params.set("view", state.view);

  if (state.view === "clase") {
    if (state.classSection === DEFAULT_STATE.classSection) params.delete("section");
    else params.set("section", state.classSection);
  } else if (state.view === "ajustes") {
    if (state.settingsSection === DEFAULT_STATE.settingsSection) params.delete("section");
    else params.set("section", state.settingsSection);
  } else {
    params.delete("section");
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}
