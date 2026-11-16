import type { ChatGPTUser } from "./auth";
import { globalRoleForUser, projectAccessForUser } from "./project-access";

/**
 * Capacidades explícitas de la matriz PERM-01 (`docs/Store/matriz-permisos.md`).
 * La evaluación es centralizada en el servidor y se resuelve por petición:
 * no se cachea ninguna decisión, así que una revocación (baja de
 * administrador o de miembro) se aplica en la siguiente llamada.
 *
 * Las demás capacidades (documentos, pizarras, miembros) se apoyan en el
 * acceso por proyecto (`projectAccessForUser` / `resolve`), ya
 * centralizado en `project-access.ts`; este módulo cubre las dos
 * capacidades con regla propia y las que comparten UI, HTTP y MCP.
 */
export type Capacidad = "instalar-app" | "asignar-libros";

/** Roles que el evaluador distingue: global de instancia y de proyecto. */
export type CapacidadContexto = {
  /** Rol global de la cuenta (`owner`, `admin` o `null` sin rol global). */
  globalRole: "owner" | "admin" | null;
  /** Rol en el proyecto concreto (`owner`, `admin`, `teacher`, `student`, `guest` o `null` sin acceso). */
  projectRole: string | null;
};

/**
 * Evalúa una capacidad contra la matriz PERM-01 (función pura, sin base
 * de datos): deniega por defecto lo no listado.
 * @param capacidad - Capacidad a evaluar.
 * @param contexto - Rol global de instancia y rol en el proyecto.
 * @returns `true` si la matriz concede la capacidad.
 */
export function evaluarCapacidad(capacidad: Capacidad, contexto: CapacidadContexto): boolean {
  switch (capacidad) {
    case "instalar-app":
      // Solo dueño o administrador de instancia. El rol de profesor por
      // sí solo nunca concede esta capacidad (aunque sea del proyecto).
      return contexto.globalRole === "owner" || contexto.globalRole === "admin";
    case "asignar-libros":
      // Dueño, administrador y profesorado del propio proyecto.
      return (
        contexto.projectRole === "owner" ||
        contexto.projectRole === "admin" ||
        contexto.projectRole === "teacher"
      );
    default:
      return false;
  }
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
  const globalRole = await globalRoleForUser(user);
  let projectRole: string | null = null;
  if (projectId) {
    projectRole = (await projectAccessForUser(projectId, user))?.role ?? null;
  } else if (capacidad === "asignar-libros") {
    // Sin proyecto no hay ámbito en el que conceder capacidades de proyecto.
    return false;
  }
  return evaluarCapacidad(capacidad, { globalRole, projectRole });
}
