import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { administrators } from "../../../db/schema";

/**
 * Acceso D1 de las fichas de administrador.
 *
 * La autorización global, la validación de datos y los mensajes del contrato
 * viven en `administradores.ts`. Las mutaciones reciben el binding D1 y el
 * ámbito permitido para que el guard SQL se construya en un solo lugar.
 */

/** Fila de `administrators_unified`. */
export type AdministratorRow = typeof administrators.$inferSelect;

/** Ámbito autorizado de una mutación: propietario o una cuenta administradora. */
export type AdministratorScope = "owner" | { userId: string };

/**
 * Guarda SQL que limita la mutación al ámbito autorizado.
 * @param scope - Propietario o cuenta administradora.
 * @returns La condición y sus argumentos.
 */
function guard(scope: AdministratorScope) {
  return scope === "owner"
    ? { sql: "1 = 1", args: [] as string[] }
    : { sql: "EXISTS (SELECT 1 FROM administrators_unified WHERE user_id = ?)", args: [scope.userId] };
}

/**
 * Lista las fichas ordenadas por nombre y correo.
 * @returns Las filas de `administrators_unified`.
 */
export async function listAdministratorRows(): Promise<AdministratorRow[]> {
  return getDb().select().from(administrators).orderBy(asc(administrators.displayName), asc(administrators.email));
}

/**
 * Busca una ficha por identificador.
 * @param id - Identificador de la ficha.
 * @returns La fila o `null`.
 */
export async function findAdministratorRow(id: string): Promise<AdministratorRow | null> {
  const [row] = await getDb().select().from(administrators).where(eq(administrators.id, id));
  return row ?? null;
}

/**
 * Crea una ficha sin cuenta vinculada.
 * @param db - Binding D1 de la instancia.
 * @param values - Identificador, correo, nombre y fecha de alta.
 * @param scope - Ámbito autorizado de la mutación.
 * @returns `true` si la fila se insertó.
 */
export async function insertAdministratorRow(
  db: D1Database,
  values: { id: string; email: string; displayName: string; createdAt: number },
  scope: AdministratorScope,
): Promise<boolean> {
  const auth = guard(scope);
  const result = await db
    .prepare(`INSERT INTO administrators_unified (id, email, user_id, display_name, revision, created_at) SELECT ?, ?, NULL, ?, 1, ? WHERE ${auth.sql} RETURNING id`)
    .bind(values.id, values.email || null, values.displayName, values.createdAt, ...auth.args)
    .all();
  return Boolean(result.results?.length);
}

/**
 * Actualiza una ficha con control de revisión.
 * @param db - Binding D1 de la instancia.
 * @param values - Campos nuevos, revisión esperada y cuenta conservada.
 * @param scope - Ámbito autorizado de la mutación.
 * @returns `true` si la fila se actualizó.
 */
export async function updateAdministratorRow(
  db: D1Database,
  values: { id: string; revision: number; displayName: string; email: string; userId: string | null },
  scope: AdministratorScope,
): Promise<boolean> {
  const auth = guard(scope);
  const result = await db
    .prepare(
      `UPDATE administrators_unified SET display_name = ?, email = ?, user_id = ?, revision = revision + 1, mutation_token = ? WHERE id = ? AND revision = ? AND ${auth.sql} RETURNING id`,
    )
    .bind(values.displayName, values.email || null, values.userId, crypto.randomUUID(), values.id, values.revision, ...auth.args)
    .all();
  return Boolean(result.results?.length);
}

/**
 * Borra una ficha con control de revisión.
 * @param db - Binding D1 de la instancia.
 * @param values - Identificador y revisión esperada.
 * @param scope - Ámbito autorizado de la mutación.
 * @returns `true` si la fila se borró.
 */
export async function deleteAdministratorRow(
  db: D1Database,
  values: { id: string; revision: number },
  scope: AdministratorScope,
): Promise<boolean> {
  const auth = guard(scope);
  const result = await db
    .prepare(`DELETE FROM administrators_unified WHERE id = ? AND revision = ? AND ${auth.sql} RETURNING id`)
    .bind(values.id, values.revision, ...auth.args)
    .all();
  return Boolean(result.results?.length);
}
