import { getD1 } from "../../../db";
import { isDemoUser } from "../../domain/demo";
import type { ChatGPTUser } from "../auth";
import { createMcpToken, listMcpTokens, revokeMcpToken, type McpTokenMeta, type TokenDatabase } from "./tokens";

/**
 * Gestión de tokens del MCP para la web: abre D1, aplica la regla de la demo
 * y devuelve un resultado tipado. La ruta solo autentica, valida la forma y
 * traduce el resultado a HTTP.
 */

type TokenFailure = { ok: false; status: number; message: string };

/** Resultado de listar los tokens propios. */
export type TokenListResult = { ok: true; tokens: McpTokenMeta[] } | TokenFailure;

/** Resultado de crear un token propio, con el secreto en claro una sola vez. */
export type TokenCreateResult =
  | { ok: true; value: { id: string; token: string; label: string; createdAt: number } }
  | TokenFailure;

/** Resultado de revocar un token propio. */
export type TokenRevokeResult = { ok: true; revoked: boolean } | TokenFailure;

/**
 * Motivo por el que la cuenta no puede gestionar tokens.
 * @param user - Cuenta autenticada.
 * @returns El estado y el mensaje del rechazo, o `null` si puede gestionar.
 */
export function tokenAccessDenial(user: ChatGPTUser): { status: number; message: string } | null {
  return isDemoUser(user) ? { status: 403, message: "La demo no puede gestionar tokens." } : null;
}

/**
 * Abre la base D1 de tokens.
 * @returns La conexión o el fallo 503 del contrato.
 */
function tokenDatabase(): { ok: true; db: TokenDatabase } | TokenFailure {
  try {
    return { ok: true, db: getD1() };
  } catch {
    return { ok: false, status: 503, message: "Base de datos no disponible." };
  }
}

/**
 * Lista los tokens de la cuenta sin secretos.
 * @param user - Cuenta autenticada.
 * @returns Los metadatos públicos o el fallo del contrato.
 */
export async function listOwnMcpTokens(user: ChatGPTUser): Promise<TokenListResult> {
  const denied = tokenAccessDenial(user);
  if (denied) return { ok: false, ...denied };
  const connection = tokenDatabase();
  if (!connection.ok) return connection;
  return { ok: true, tokens: await listMcpTokens(connection.db, user.userId) };
}

/**
 * Crea un token para la cuenta y devuelve el secreto una única vez.
 * @param user - Cuenta autenticada.
 * @param label - Etiqueta ya validada por la ruta.
 * @returns El token creado o el fallo del contrato.
 */
export async function createOwnMcpToken(user: ChatGPTUser, label: string): Promise<TokenCreateResult> {
  const denied = tokenAccessDenial(user);
  if (denied) return { ok: false, ...denied };
  const connection = tokenDatabase();
  if (!connection.ok) return connection;
  return { ok: true, value: await createMcpToken(connection.db, user.userId, user.email, label) };
}

/**
 * Revoca un token propio.
 * @param user - Cuenta autenticada.
 * @param id - Identificador ya validado por la ruta.
 * @returns Si se revocó, o el fallo del contrato.
 */
export async function revokeOwnMcpToken(user: ChatGPTUser, id: string): Promise<TokenRevokeResult> {
  const denied = tokenAccessDenial(user);
  if (denied) return { ok: false, ...denied };
  const connection = tokenDatabase();
  if (!connection.ok) return connection;
  return { ok: true, revoked: await revokeMcpToken(connection.db, user.userId, id) };
}
