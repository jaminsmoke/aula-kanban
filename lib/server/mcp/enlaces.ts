import { buildBoardUrl, type BoardUrlState, type BoardView, type ClassSection, type SettingsSection } from "../../domain/board-url";

/**
 * Enlaces canónicos del Site para las respuestas MCP.
 *
 * Construyen la URL desde el esquema compartido de `lib/domain/board-url`
 * (la copia a mano de `links.ts` se retiró al mover el esquema a `lib/`,
 * MCP-01) y la hacen absoluta con el origen de la petición, informado por
 * cada puerta en `extra.origen`. Sin origen (tests y clientes antiguos) el
 * enlace queda relativo, como en la v1.
 */

/**
 * URL de una vista del tablero para un proyecto, absoluta si hay origen.
 * @param origen - Origen del Site (p. ej. `https://…`) o `undefined` para relativa.
 * @param projectId - Identificador del proyecto.
 * @param view - Vista pedida (`clase` por defecto).
 * @param classSection - Sección de Clase (`tareas` por defecto).
 * @param settingsSection - Sección de Ajustes (`cuenta` por defecto).
 * @param app - App de Mi espacio a abrir (`app=<appId>`), si se pide.
 * @returns La URL canónica, absoluta o relativa.
 */
export function enlace(
  origen: string | undefined,
  projectId: string,
  view: BoardView = "clase",
  classSection: ClassSection = "tareas",
  settingsSection: SettingsSection = "cuenta",
  app?: string,
): string {
  const state: BoardUrlState = { view, classSection, settingsSection };
  let query = buildBoardUrl(`?project=${encodeURIComponent(projectId)}`, state);
  if (app) {
    const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
    params.set("app", app);
    query = `?${params.toString()}`;
  }
  const ruta = `/${query}`;
  return origen ? `${origen}${ruta}` : ruta;
}

/**
 * URL de Clase — Tareas de un proyecto.
 * @param origen - Origen del Site o `undefined` para relativa.
 * @param projectId - Identificador del proyecto.
 * @returns La URL de la vista de tareas.
 */
export function projectUrl(origen: string | undefined, projectId: string): string {
  return enlace(origen, projectId, "clase", "tareas");
}

/**
 * URL de Clase — Calendario de un proyecto.
 * @param origen - Origen del Site o `undefined` para relativa.
 * @param projectId - Identificador del proyecto.
 * @returns La URL del calendario.
 */
export function calendarUrl(origen: string | undefined, projectId: string): string {
  return enlace(origen, projectId, "clase", "calendario");
}
