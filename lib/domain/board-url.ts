/**
 * Esquema de URL del tablero (Fase 1 del roadmap de URLs por vista y sección).
 *
 * - `project`: id del proyecto activo. Lo sigue leyendo `use-projects`; aquí
 *   solo se conserva, nunca se reescribe.
 * - `view`: una de `clase | alumnos | profesores | espacio | ajustes |
 *   documentacion`. Por defecto `clase`.
 * - `section`: sección dentro de la vista. En `clase` es `tareas` (por
 *   defecto) o `calendario`; en `ajustes` es `cuenta | apariencia | tokens |
 *   administradores | almacenamiento` (por defecto `cuenta`). En el resto de
 *   vistas no tiene significado y se omite.
 *
 * La forma canónica omite los valores por defecto: `/?project=p1` ya es
 * Clase > Tareas y `/?project=p1&view=ajustes` ya es Ajustes > Cuenta.
 * Los valores inválidos caen al defecto de su vista. Los parámetros
 * desconocidos y el hash (`#docs-…`) se conservan tal cual.
 *
 * Vive en `lib/domain` para que lo compartan la interfaz (cliente) y el MCP
 * (servidor): la antigua copia a mano de `lib/server/mcp/links.ts` se retiró
 * al mover el esquema aquí (MCP-01).
 */

/** Vistas válidas del tablero. */
export type BoardView = "clase" | "alumnos" | "profesores" | "espacio" | "ajustes" | "documentacion";

/** Secciones válidas dentro de Clase. */
export type ClassSection = "tareas" | "calendario";

/** Secciones válidas dentro de Ajustes. */
export type SettingsSection = "cuenta" | "apariencia" | "tokens" | "administradores" | "almacenamiento";

/** Vistas válidas del tablero. */
export const BOARD_VIEWS: readonly BoardView[] = [
  "clase",
  "alumnos",
  "profesores",
  "espacio",
  "ajustes",
  "documentacion",
];

/** Secciones válidas dentro de Clase. */
export const CLASS_SECTIONS: readonly ClassSection[] = ["tareas", "calendario"];

/** Secciones válidas dentro de Ajustes, en el orden de navegación. */
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  "cuenta",
  "apariencia",
  "tokens",
  "administradores",
  "almacenamiento",
];

/** Estado de vista y sección derivado de la URL. */
export type BoardUrlState = {
  view: BoardView;
  classSection: ClassSection;
  settingsSection: SettingsSection;
  /** Id de la app del catálogo a abrir al cargar `view=espacio` (`app=<appId>`). */
  app?: string | null;
};

const DEFAULT_STATE: BoardUrlState = {
  view: "clase",
  classSection: "tareas",
  settingsSection: "cuenta",
};

/**
 * Lee vista y sección de una query string, con defectos y valores inválidos resueltos.
 * El parámetro `app` solo tiene significado en `view=espacio` (MCP-04): fuera
 * de esa vista se ignora y se conserva como parámetro desconocido.
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
  const settingsSection: SettingsSection = SETTINGS_SECTIONS.includes(rawSection as SettingsSection)
    ? (rawSection as SettingsSection)
    : DEFAULT_STATE.settingsSection;

  const app = view === "espacio" ? params.get("app") : null;
  return { view, classSection, settingsSection, app };
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

  // `app` solo pertenece a Mi espacio: fuera de esa vista se retira.
  if (state.view === "espacio" && state.app) params.set("app", state.app);
  else params.delete("app");

  const query = params.toString();
  return query ? `?${query}` : "";
}
