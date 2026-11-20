import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "./auth";
import { isAdministrator, isOwner, isOwnerContactEmail } from "../projects/project-access";
import {
  deleteAdministratorRow,
  findAdministratorRow,
  insertAdministratorRow,
  listAdministratorRows,
  updateAdministratorRow,
  type AdministratorRow,
  type AdministratorScope,
} from "./administradores-repository";

/**
 * Administradores de la instancia.
 *
 * La ruta `/api/administrators` y el dominio MCP comparten estas funciones:
 * la comprobación global de propietario o administrador, la invitación por
 * correo, la revisión y los mismos mensajes de error. El acceso D1 vive en
 * `administradores-repository.ts`.
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

/**
 * Convierte una fila en la ficha pública.
 * @param row - Fila de `administrators_unified`.
 * @returns La ficha sin `userId` ni `mutationToken`.
 */
function vista(row: AdministratorRow): AdministradorView {
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
  const rows = await listAdministratorRows();
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
  const scope: AdministratorScope = acceso.owner ? "owner" : { userId: user.userId };
  try {
    const inserted = await insertAdministratorRow(binding, { id, email, displayName, createdAt: Date.now() }, scope);
    if (!inserted) return { ok: false, status: 403, message: "Ya no tienes permiso para crear fichas de administrador." };
    const created = await findAdministratorRow(id);
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
  const current = await findAdministratorRow(input.id);
  if (!current) return { ok: false, status: 404, message: "La ficha ya no existe." };
  const nextEmail = correoPedido === undefined ? (current.email ?? "") : correoPedido;
  const displayName = input.displayName ?? current.displayName;
  // Solo un correo sin cambios conserva la cuenta vinculada.
  const userId = current.email !== null && current.email === nextEmail ? current.userId : null;
  const binding = env.DB;
  if (!binding) return { ok: false, status: 503, message: "Base de datos no disponible." };
  const scope: AdministratorScope = acceso.owner ? "owner" : { userId: user.userId };
  try {
    const updated = await updateAdministratorRow(binding, {
      id: input.id,
      revision: input.revision ?? current.revision,
      displayName,
      email: nextEmail,
      userId,
    }, scope);
    if (!updated) return { ok: false, status: 409, message: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." };
    const saved = await findAdministratorRow(input.id);
    if (!saved) return { ok: false, status: 409, message: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." };
    return { ok: true, valor: vista(saved) };
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
  const current = await findAdministratorRow(input.id);
  if (!current) return { ok: false, status: 404, message: "La ficha ya no existe." };
  const binding = env.DB;
  if (!binding) return { ok: false, status: 503, message: "Base de datos no disponible." };
  const scope: AdministratorScope = acceso.owner ? "owner" : { userId: user.userId };
  try {
    const deleted = await deleteAdministratorRow(binding, { id: input.id, revision: input.revision ?? current.revision }, scope);
    if (!deleted) return { ok: false, status: 409, message: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." };
    return { ok: true, valor: { id: input.id } };
  } catch {
    return { ok: false, status: 409, message: "No se pudo eliminar la ficha." };
  }
}
