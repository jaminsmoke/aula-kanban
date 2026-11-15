import { json } from "./http";
import { PROJECT_FAILURE_MESSAGES } from "./project-contract";
import type { ProjectFailure } from "./project-access";

export const PROJECT_FAILURE_RESPONSES: Record<ProjectFailure, { status: number; message: string }> = {
  unauthenticated: { status: 401, message: PROJECT_FAILURE_MESSAGES.unauthenticated },
  invalid: { status: 400, message: PROJECT_FAILURE_MESSAGES.invalid },
  not_found: { status: 404, message: PROJECT_FAILURE_MESSAGES.not_found },
  forbidden: { status: 403, message: PROJECT_FAILURE_MESSAGES.forbidden },
};

/**
 * Construye la respuesta HTTP común de un fallo al resolver el proyecto.
 * @param failure - Motivo tipado del fallo.
 * @returns Respuesta JSON con el estado y mensaje del contrato.
 */
export function projectFailureResponse(failure: ProjectFailure): Response {
  const response = PROJECT_FAILURE_RESPONSES[failure];
  return json({ message: response.message }, response.status);
}
