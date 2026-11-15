import type { ProjectFailure } from "./project-access";

/** Mensajes públicos de los fallos al resolver o usar un proyecto. */
export const PROJECT_FAILURE_MESSAGES: Record<ProjectFailure, string> = {
  unauthenticated: "Inicia sesión para continuar.",
  invalid: "Proyecto no válido.",
  not_found: "No se encuentra el proyecto.",
  forbidden: "No tienes acceso a este proyecto.",
};
