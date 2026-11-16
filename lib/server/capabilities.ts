import type { ChatGPTUser } from "./auth";
import { capacidadConcedida, definicionCapacidad, type Capacidad, type CapacidadContexto } from "../domain/permisos";
import { globalRoleForUser, projectAccessForUser } from "./project-access";

/**
 * Evaluación autoritativa de la matriz de permisos (PERM-01) en el
 * servidor. La matriz vive en `lib/domain/permisos.ts` (fuente única de
 * PERM-02) para que la interfaz muestre exactamente lo que aquí se evalúa.
 *
 * Se resuelve por petición y sin caché: una revocación (baja de
 * administrador o de miembro) se aplica en la siguiente llamada.
 *
 * Las demás capacidades (documentos, pizarras, miembros) se apoyan en el
 * acceso por proyecto (`projectAccessForUser` / `resolve`), ya
 * centralizado en `project-access.ts`; este módulo evalúa las que tienen
 * regla propia y las comparten UI, HTTP y MCP.
 */
export type { Capacidad, CapacidadContexto } from "../domain/permisos";

/**
 * Evalúa una capacidad contra la matriz de permisos.
 * @param capacidad - Capacidad a evaluar.
 * @param contexto - Rol global de instancia y rol en el proyecto.
 * @returns `true` si la matriz concede la capacidad.
 */
export function evaluarCapacidad(capacidad: Capacidad, contexto: CapacidadContexto): boolean {
  return capacidadConcedida(capacidad, contexto);
}

/**
 * Resuelve la capacidad para una cuenta en un proyecto, consultando el
 * rol global y el acceso al proyecto en cada llamada (sin caché).
 * @param user - Cuenta autenticada.
 * @param capacidad - Capacidad a evaluar.
 * @param projectId - Proyecto de ámbito cuando la capacidad es de proyecto.
 * @returns `true` si la matriz concede la capacidad.
 */
export async function tieneCapacidad(
  user: ChatGPTUser,
  capacidad: Capacidad,
  projectId?: string,
): Promise<boolean> {
  const definicion = definicionCapacidad(capacidad);
  if (!definicion) return false;
  // Sin proyecto no hay ámbito en el que conceder capacidades de proyecto.
  if (definicion.ambito === "proyecto" && !projectId) return false;
  const globalRole = await globalRoleForUser(user);
  const projectRole = projectId ? ((await projectAccessForUser(projectId, user))?.role ?? null) : null;
  return capacidadConcedida(capacidad, { globalRole, projectRole });
}
