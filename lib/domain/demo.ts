/** Identificador fijo del proyecto ficticio que usa la demo y `scripts/seed-demo.mjs`. */
export const DEMO_PROJECT_ID = "22222222-2222-4222-8222-222222222222";

/** Nombre visible del proyecto de demostración. */
export const DEMO_PROJECT_NAME = "Proyecto de demostración";

/** Cookie que activa la identidad de demo en el servidor. */
export const DEMO_COOKIE = "__demo";

/**
 * Identidad fija de la demo. No se lee de cabeceras ni de la URL: el cliente
 * solo puede activarla o desactivarla con la cookie, nunca cambiar quién es.
 */
export const DEMO_USER = {
  userId: "demo_local",
  email: "demo@aula-kanban.invalid",
  displayName: "Demo",
  fullName: "Demo",
} as const;

/**
 * Indica si una cuenta es la identidad reservada de la demo.
 * @param user - Cuenta con identificador.
 * @returns `true` cuando el identificador es el de la demo.
 */
export function isDemoUser(user: { userId: string }): boolean {
  return user.userId === DEMO_USER.userId;
}
