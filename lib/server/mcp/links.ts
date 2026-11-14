/**
 * Enlaces relativos del Site para las respuestas MCP.
 *
 * Repiten a mano el esquema de URL ya publicado (`?project=…&view=…&section=…`)
 * porque `lib/` no puede importar desde `app/`: si cambia el esquema, hay que
 * actualizar estas dos funciones junto con `app/board/shared/board-url.ts`.
 */

/**
 * URL de Clase — Tareas de un proyecto.
 * @param projectId - Identificador del proyecto.
 * @returns Ruta relativa del tablero del proyecto.
 */
export function projectUrl(projectId: string): string {
  return `/?project=${encodeURIComponent(projectId)}`;
}

/**
 * URL de Clase — Calendario de un proyecto.
 * @param projectId - Identificador del proyecto.
 * @returns Ruta relativa del calendario del proyecto.
 */
export function calendarUrl(projectId: string): string {
  return `/?project=${encodeURIComponent(projectId)}&section=calendario`;
}
