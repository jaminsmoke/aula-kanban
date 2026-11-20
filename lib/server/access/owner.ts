import type { ChatGPTUser } from "./auth";
import { claimOwnerRow, readOwnerRow, updateOwnerEmailRow, type InstanceOwnerRow } from "./owner-repository";

/** Identidad persistida del propietario de la instancia. */
export type InstanceOwner = InstanceOwnerRow;

/** Datos mínimos de una cuenta para resolver la propiedad. */
export type OwnerUser = Pick<ChatGPTUser, "userId" | "email">;

/**
 * Devuelve el correo configurado para el bootstrap, con el valor local de desarrollo.
 * @param configured - Valor de `OWNER_EMAIL`.
 * @returns El correo normalizado o una cadena vacía.
 */
export function configuredOwnerEmail(configured?: string) {
  if (configured === "") return "";
  return (configured || (import.meta.env.DEV ? "seedy@sites.test" : "")).trim().toLowerCase();
}

/**
 * Indica si un correo coincide con el bootstrap configurado.
 * @param email - Correo de la cuenta.
 * @param configured - Valor de `OWNER_EMAIL`.
 * @returns `true` cuando puede reclamar la propiedad inicial.
 */
export function isBootstrapOwnerEmail(email: string, configured?: string) {
  const owner = configuredOwnerEmail(configured);
  return Boolean(owner) && email.trim().toLowerCase() === owner;
}

/**
 * Lee el propietario persistido de la instancia.
 * @param db - Base D1 de la instancia.
 * @returns La identidad guardada o `null` si aún no existe.
 */
export async function readInstanceOwner(db: D1Database): Promise<InstanceOwner | null> {
  try {
    return await readOwnerRow(db);
  } catch {
    return null;
  }
}

/**
 * Garantiza que existe un propietario: lo lee o lo reclama con el bootstrap.
 * No reclama la propiedad para un correo distinto del configurado.
 * @param db - Base D1 de la instancia.
 * @param user - Cuenta autenticada.
 * @param configured - Valor de `OWNER_EMAIL`.
 * @returns La identidad persistida o `null` si no puede reclamarse.
 */
export async function ensureInstanceOwner(db: D1Database, user: OwnerUser, configured?: string): Promise<InstanceOwner | null> {
  const email = user.email.trim().toLowerCase();
  const existing = await readInstanceOwner(db);
  if (existing) {
    if (existing.userId === user.userId && existing.email !== email) {
      try {
        await updateOwnerEmailRow(db, user.userId, email);
        return { ...existing, email };
      } catch {
        return existing;
      }
    }
    return existing;
  }
  if (!isBootstrapOwnerEmail(email, configured)) return null;
  try {
    await claimOwnerRow(db, user.userId, email, Date.now());
  } catch {
    return null;
  }
  return readInstanceOwner(db);
}

/**
 * Indica si una identidad persistida pertenece a la cuenta indicada.
 * @param owner - Propietario persistido.
 * @param user - Cuenta autenticada.
 * @returns `true` cuando el identificador estable coincide.
 */
export function isInstanceOwner(owner: InstanceOwner | null, user: OwnerUser) {
  return Boolean(owner) && owner?.userId === user.userId;
}
