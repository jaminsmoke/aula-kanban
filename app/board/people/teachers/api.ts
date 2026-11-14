import { request } from "../../shared/api";
import type { Teacher } from "./model";

const path = "/api/teachers";

/**
 * Carga las fichas de profesores de un proyecto.
 * @param projectId - Proyecto del que se cargan las fichas.
 * @returns Promesa con las fichas de profesores.
 */
export function listTeachers(projectId: string) {
  return request<Teacher[]>("GET", undefined, path, projectId).catch(() => {
    throw new Error("No se pudieron cargar los profesores.");
  });
}

/**
 * Crea, actualiza o elimina una ficha de profesor.
 * @param projectId - Proyecto propietario de la ficha.
 * @param method - Operación a realizar.
 * @param body - Datos de la ficha o su identificador y revisión.
 * @returns Promesa con la ficha resultante.
 */
export const saveTeacher = (projectId: string, method: "POST" | "PATCH" | "DELETE", body: unknown) =>
  request<Teacher>(method, body, path, projectId);
