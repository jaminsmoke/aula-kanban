import type { ChatGPTUser } from "../auth";
import { findProject, projectAccessForUser, PROJECT_FAILURE_RESPONSES, type Access, type ProjectFailure, type ProjectRow } from "../project-access";

/**
 * Contexto compartido de las herramientas MCP: cuenta llamante, resolución
 * de proyectos y resultados/errores con el contrato HTTP.
 *
 * Las dos puertas (`/mcp` del plugin e `/api/mcp` de tokens/OAuth) comparten
 * este contexto y los registros de `dominios/`: una herramienta nunca decide
 * permisos por su cuenta.
 */

/** Cuenta identificada por el token, sin depender de las cabeceras de ChatGPT. */
export type McpCaller = { userId: string; email: string; via?: "plugin" | "personal" | "oauth"; clientId?: string; tokenId?: string; /** Origen del Site para enlaces absolutos, si la puerta lo informa. */ origen?: string };

/** Vía por la que llega la llamada, para auditoría y límites. */
export type McpVia = NonNullable<McpCaller["via"]>;

/** Códigos de error del contrato MCP (subconjunto tipado del contrato HTTP). */
export type CodigoError = ProjectFailure | "conflict" | "too_large" | "unavailable" | "rate_limited" | "error";

/** Estado HTTP asociado a cada código de error. */
export const CODIGO_ESTADO: Record<CodigoError, number> = {
  unauthenticated: 401,
  invalid: 400,
  not_found: 404,
  forbidden: 403,
  conflict: 409,
  too_large: 413,
  unavailable: 503,
  rate_limited: 429,
  error: 500,
};

/** Resultado de una herramienta: texto JSON más el mismo dato estructurado. */
export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

/** Información extra que pasa el SDK (o el collector del plugin) en cada llamada. */
export type Extra = { authInfo?: { clientId?: string; extra?: { userId?: string; email?: string; via?: McpVia; clientId?: string; tokenId?: string; origen?: string } } };

/**
 * Construye la cuenta de ChatGPT equivalente para las reglas de permisos.
 * @param caller - Cuenta del token MCP.
 * @returns La cuenta con el nombre visible del correo.
 */
export function toChatGPTUser(caller: McpCaller): ChatGPTUser {
  return { userId: caller.userId, email: caller.email, displayName: caller.email, fullName: null };
}

/**
 * Extrae la cuenta del token de la llamada MCP actual.
 * @param extra - Información extra que pasa el SDK en cada llamada.
 * @returns La cuenta o `null` si falta la identidad.
 */
export function callerFromExtra(extra: Extra): McpCaller | null {
  const userId = extra.authInfo?.extra?.userId;
  const email = extra.authInfo?.extra?.email;
  if (!userId) return null;
  return {
    userId,
    email: email ?? "",
    via: extra.authInfo?.extra?.via,
    clientId: extra.authInfo?.extra?.clientId ?? extra.authInfo?.clientId,
    tokenId: extra.authInfo?.extra?.tokenId,
    origen: extra.authInfo?.extra?.origen,
  };
}

/**
 * Resultado correcto con la carga en JSON dentro de un texto y el mismo
 * payload como `structuredContent` para clientes actuales.
 * @param payload - Datos de la respuesta.
 * @returns El resultado para el cliente MCP.
 */
export function payloadResult(payload: Record<string, unknown>): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], structuredContent: payload };
}

/**
 * Error de herramienta con el contrato HTTP: `isError` más
 * `structuredContent.error = { codigo, estado, mensaje }`.
 * @param codigo - Código tipado del fallo (`unauthenticated`, `not_found`, …).
 * @param mensaje - Mensaje del contrato HTTP equivalente.
 * @param detalle - Extra estructurado opcional (p. ej. la revisión actual en un `conflict`).
 * @returns El resultado de herramienta con `isError`.
 */
export function errorHerramienta(codigo: CodigoError, mensaje: string, detalle?: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text: mensaje }],
    structuredContent: { error: { codigo, estado: CODIGO_ESTADO[codigo], mensaje, ...detalle } },
    isError: true,
  };
}

/**
 * Compatibilidad con las llamadas anteriores: error sin código concreto.
 * @param message - Mensaje del contrato HTTP equivalente.
 * @returns El resultado de herramienta con `isError`.
 */
export function toolError(message: string): ToolResult {
  return errorHerramienta("error", message);
}

/** Proyecto resuelto con el acceso de la cuenta, o el fallo tipado. */
export type Resolved = { ok: true; project: ProjectRow; access: Access } | { ok: false; codigo: CodigoError; mensaje: string };

/**
 * Resuelve un proyecto y el acceso de la cuenta, como `resolveProject`.
 * @param user - Cuenta de ChatGPT equivalente del token.
 * @param projectId - Identificador del proyecto.
 * @returns El proyecto con acceso o el error del contrato HTTP.
 */
export async function resolve(user: ChatGPTUser, projectId: string): Promise<Resolved> {
  const project = await findProject(projectId);
  if (!project) return { ok: false, codigo: "not_found", mensaje: PROJECT_FAILURE_RESPONSES.not_found.message };
  const access = await projectAccessForUser(projectId, user);
  if (!access) return { ok: false, codigo: "forbidden", mensaje: PROJECT_FAILURE_RESPONSES.forbidden.message };
  return { ok: true, project, access };
}

/**
 * Convierte el fallo de `resolve` en resultado de herramienta.
 * @param resolved - Fallo devuelto por `resolve`.
 * @returns El resultado con el contrato de error.
 */
export function falloResolucion(resolved: { ok: false; codigo: CodigoError; mensaje: string }): ToolResult {
  return errorHerramienta(resolved.codigo, resolved.mensaje);
}
