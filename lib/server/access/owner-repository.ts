/**
 * Acceso D1 a la identidad del propietario de la instancia.
 *
 * Las reglas de bootstrap y de identidad estable viven en `owner.ts`; aquí
 * solo se lee y escribe la fila única `instance_owner`.
 */

/** Fila persistida del propietario. */
export type InstanceOwnerRow = {
  userId: string;
  email: string;
  claimedAt: number;
};

const OWNER_ROW_ID = "owner";

/**
 * Lee la fila del propietario.
 * @param db - Base D1 de la instancia.
 * @returns La fila guardada o `null` si aún no existe.
 */
export async function readOwnerRow(db: D1Database): Promise<InstanceOwnerRow | null> {
  return await db.prepare("SELECT user_id AS userId, email, claimed_at AS claimedAt FROM instance_owner WHERE id = ?")
    .bind(OWNER_ROW_ID)
    .first<InstanceOwnerRow>() ?? null;
}

/**
 * Reclama la fila del propietario sin sobrescribir una ya existente.
 * @param db - Base D1 de la instancia.
 * @param userId - Identificador estable de la cuenta.
 * @param email - Correo normalizado.
 * @param claimedAt - Marca de tiempo del reclamo.
 */
export async function claimOwnerRow(db: D1Database, userId: string, email: string, claimedAt: number): Promise<void> {
  await db.prepare("INSERT INTO instance_owner (id, user_id, email, claimed_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
    .bind(OWNER_ROW_ID, userId, email, claimedAt)
    .run();
}

/**
 * Actualiza el correo de contacto del propietario.
 * @param db - Base D1 de la instancia.
 * @param userId - Identificador estable de la cuenta.
 * @param email - Correo normalizado.
 */
export async function updateOwnerEmailRow(db: D1Database, userId: string, email: string): Promise<void> {
  await db.prepare("UPDATE instance_owner SET email = ? WHERE id = ? AND user_id = ?")
    .bind(email, OWNER_ROW_ID, userId)
    .run();
}
