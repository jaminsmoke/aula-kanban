import { env } from "cloudflare:workers";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { administrators } from "../../db/schema";
import type { ChatGPTUser } from "./auth";
import { isAdministrator, isOwner, isOwnerContactEmail } from "./project";

/**
 * Administradores de la instancia.
 *
 * La ruta `/api/administrators` y el dominio MCP comparten estas funciones:
 * la comprobación global de propietario o administrador, la invitación por
 * correo, la revisión y los mismos mensajes de error.
 */

/** Mensaje único para las cuentas sin permiso de administración. */
export const ADMINISTRADORES_FORBIDDEN = "Solo el propietario o un administrador pueden gestionar administradores.";

/** Ficha pública de administrador. */
export type AdministradorView = {
  id: string;
  displayName: string;
  email: string;
  revision: number;
  accountStatus: "active" | "pending" | "unlinked";
  active: boolean;
};

/** Resultado de una operación de administración. */
export type AdministradorResult<T> =
  | { ok: true; valor: T }
  | { ok: false; status: number; message: string };

type Row = typeof administrators.$inferSelect;

/**
 * Convierte una fila en la ficha pública.
 * @param row - Fila de `administrators_unified`.
 * @returns La ficha sin `userId` ni `mutationToken`.
 */
function vista(row: Row): AdministradorView {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email ?? "",
    revision: row.revision,
    accountStatus: row.userId ? "active" : row.email ? "pending" : "unlinked",
    active: Boolean(row.userId),
  };
}

/**
 * Guarda SQL que limita la mutación a propietario o administrador.
 * @param user - Cuenta autenticada.
 * @param owner - Si la cuenta es propietaria.
 * @returns La condición y sus argumentos.
 */
function guard(user: ChatGPTUser, owner: boolean) {
  return owner
    ? { sql: "1 = 1", args: [] as string[] }
    : { sql: "EXISTS (SELECT 1 FROM administrators_unified WHERE user_id = ?)", args: [user.userId] };
}

/**
 * Comprueba el rol global de administración.
 * @param user - Cuenta autenticada.
 * @returns `{ owner }` o el error 403.
 */
async function autorizacion(user: ChatGPTUser): Promise<{ ok: true; owner: boolean } | { ok: false; status: 403; message: string }> {
  const owner = await isOwner(user);
  if (owner || (await isAdministrator(user))) return { ok: true, owner };
  return { ok: false, status: 403, message: ADMINISTRADORES_FORBIDDEN };
}

/**
 * Indica si la cuenta puede gestionar administradores.
 * @param user - Cuenta autenticada.
 * @returns `true` para propietario o administrador.
 */
export async function puedeGestionarAdministradores(user: ChatGPTUser) {
  return (await autorizacion(user)).ok;
}

/**
 * Lista las fichas de administrador ordenadas por nombre y correo.
 * @param user - Cuenta autenticada.
 * @returns Las fichas visibles o el error de permiso.
 */
export async function listarAdministradores(user: ChatGPTUser): Promise<AdministradorResult<AdministradorView[]>> {
  const acceso = await autorizacion(user);
  if (!acceso.ok) return acceso;
  const rows = await getDb().select().from(administrators).orderBy(asc(administrators.displayName), asc(administrators.email));
  return { ok: true, valor: rows.map(vista) };
}

/** Datos de alta de una ficha de administrador. */
export type CrearAdministradorInput = {
  displayName?: string;
  email?: string;
};

/**
 * Crea una ficha de administrador; con correo queda pendiente de aceptación.
 * @param user - Cuenta autenticada.
 * @param input - Nombre visible y correo opcional.
 * @returns La ficha creada o el error del contrato.
 */
export async function crearAdministrador(user: ChatGPTUser, input: CrearAdministradorInput): Promise<AdministradorResult<AdministradorView>> {
  const acceso = await autorizacion(user);
  if (!acceso.ok) return acceso;
  const email = (input.email ?? "").trim().toLowerCase();
  const displayName = input.displayName ?? "";
  if (email && (await isOwnerContactEmail(email))) return { ok: false, status: 400, message: "La cuenta propietaria ya es administradora." };
  const binding = env.DB;
  if (!binding) return { ok: false, status: 503, message: "Base de datos no disponible." };
  const id = crypto.randomUUID();
  const auth = guard(user, acceso.owner);
  try {
    const createdAt = Date.now();
    const result = await binding
      .prepare(`INSERT INTO administrators_unified (id, email, user_id, display_name, revision, created_at) SELECT ?, ?, NULL, ?, 1, ? WHERE ${auth.sql} RETURNING id`)
      .bind(id, email || null, displayName, createdAt, ...auth.args)
      .all();
    if (!result.results?.length) return { ok: false, status: 403, message: "Ya no tienes permiso para crear fichas de administrador." };
    const [created] = await getDb().select().from(administrators).where(eq(administrators.id, id));
    if (!created) return { ok: false, status: 409, message: "No se pudo crear la ficha. Comprueba que el correo no esté ya asignado a otro administrador." };
    return { ok: true, valor: vista(created) };
  } catch {
    return { ok: false, status: 409, message: "No se pudo crear la ficha. Comprueba que el correo no esté ya asignado a otro administrador." };
  }
}

/** Datos de edición de una ficha de administrador. */
export type ActualizarAdministradorInput = {
  id: string;
  revision?: number;
  displayName?: string;
  email?: string;
};

/**
 * Actualiza una ficha; cambiar el correo retira el acceso hasta reaceptar.
 * @param user - Cuenta autenticada.
 * @param input - Identificador, revisión y campos nuevos.
 * @returns La ficha actualizada o el error del contrato.
 */
export async function actualizarAdministrador(user: ChatGPTUser, input: ActualizarAdministradorInput): Promise<AdministradorResult<AdministradorView>> {
  const acceso = await autorizacion(user);
  if (!acceso.ok) return acceso;
  const correoPedido = input.email === undefined ? undefined : input.email.trim().toLowerCase();
  if (correoPedido && (await isOwnerContactEmail(correoPedido))) return { ok: false, status: 400, message: "La cuenta propietaria ya es administradora." };
  const db = getDb();
  const [current] = await db.select().from(administrators).where(eq(administrators.id, input.id));
  if (!current) return { ok: false, status: 404, message: "La ficha ya no existe." };
  const nextEmail = correoPedido === undefined ? (current.email ?? "") : correoPedido;
  const displayName = input.displayName ?? current.displayName;
  // Solo un correo sin cambios conserva la cuenta vinculada.
  const userId = current.email !== null && current.email === nextEmail ? current.userId : null;
  const binding = env.DB;
  if (!binding) return { ok: false, status: 503, message: "Base de datos no disponible." };
  const auth = guard(user, acceso.owner);
  try {
    const result = await binding
      .prepare(
        `UPDATE administrators_unified SET display_name = ?, email = ?, user_id = ?, revision = revision + 1, mutation_token = ? WHERE id = ? AND revision = ? AND ${auth.sql} RETURNING id`,
      )
      .bind(displayName, nextEmail || null, userId, crypto.randomUUID(), input.id, input.revision ?? current.revision, ...auth.args)
      .all();
    if (!result.results?.length) return { ok: false, status: 409, message: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." };
    const [updated] = await db.select().from(administrators).where(eq(administrators.id, input.id));
    if (!updated) return { ok: false, status: 409, message: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." };
    return { ok: true, valor: vista(updated) };
  } catch {
    return { ok: false, status: 409, message: "No se guardaron los cambios. Comprueba que el correo no esté asignado a otro administrador." };
  }
}

/** Datos de baja de una ficha de administrador. */
export type EliminarAdministradorInput = {
  id: string;
  revision?: number;
};

/**
 * Elimina una ficha de administrador con su revisión.
 * @param user - Cuenta autenticada.
 * @param input - Identificador y revisión de la ficha.
 * @returns El identificador eliminado o el error del contrato.
 */
export async function eliminarAdministrador(user: ChatGPTUser, input: EliminarAdministradorInput): Promise<AdministradorResult<{ id: string }>> {
  const acceso = await autorizacion(user);
  if (!acceso.ok) return acceso;
  const db = getDb();
  const [current] = await db.select().from(administrators).where(eq(administrators.id, input.id));
  if (!current) return { ok: false, status: 404, message: "La ficha ya no existe." };
  const binding = env.DB;
  if (!binding) return { ok: false, status: 503, message: "Base de datos no disponible." };
  const auth = guard(user, acceso.owner);
  try {
    const result = await binding
      .prepare(`DELETE FROM administrators_unified WHERE id = ? AND revision = ? AND ${auth.sql} RETURNING id`)
      .bind(input.id, input.revision ?? current.revision, ...auth.args)
      .all();
    if (!result.results?.length) return { ok: false, status: 409, message: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." };
    return { ok: true, valor: { id: input.id } };
  } catch {
    return { ok: false, status: 409, message: "No se pudo eliminar la ficha." };
  }
}
