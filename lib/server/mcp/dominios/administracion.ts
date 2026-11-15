import { z } from "zod";
import { getD1 } from "../../../../db";
import { actualizarAdministrador, crearAdministrador, eliminarAdministrador, listarAdministradores } from "../../administradores";
import { isAdministrator, isOwner } from "../../project-access";
import { consultarAuditoria } from "../auditoria";
import { listMcpTokens, revokeMcpToken } from "../tokens";
import { errorHerramienta, payloadResult, toChatGPTUser, type McpCaller } from "../contexto";
import { paginaDesde, type McpToolDefinicion } from "./tipos";

/**
 * Dominio de administración de la instancia (MCP-09): fichas de administrador
 * y tokens MCP propios. El propietario y la administración son roles globales,
 * no de proyecto; las fichas comparten la lógica de `/api/administrators` y
 * los tokens la de `/api/mcp/tokens`. Ninguna herramienta crea tokens ni
 * expone secretos.
 */

const correo = z
  .string()
  .trim()
  .max(254)
  .refine((value) => !value || z.string().email().safeParse(value).success, "Correo no válido")
  .transform((value) => value.toLowerCase())
  .optional();
const nombre = z.string().trim().max(80).optional();
const administradorId = z.string().uuid().describe("Id de la ficha de administrador");
const tokenId = z.string().uuid().describe("Id del token MCP propio");
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida").describe("Fecha YYYY-MM-DD");
const via = z.enum(["plugin", "personal", "oauth"]).describe("Vía de la llamada MCP");

/**
 * Convierte las fechas ISO de los filtros a milisegundos UTC inclusivos.
 * @param args - Filtros `desde` y `hasta` opcionales.
 * @returns El rango o `null` si no es válido.
 */
function rangoDeFechas(args: { desde?: string; hasta?: string }) {
  const desde = args.desde ? Date.parse(`${args.desde}T00:00:00.000Z`) : undefined;
  const hasta = args.hasta ? Date.parse(`${args.hasta}T23:59:59.999Z`) : undefined;
  if ((desde !== undefined && !Number.isFinite(desde)) || (hasta !== undefined && !Number.isFinite(hasta))) return null;
  if (desde !== undefined && hasta !== undefined && desde > hasta) return null;
  return { desde, hasta };
}

/**
 * Traduce un fallo de administración al contrato MCP.
 * @param result - Fallo con estado HTTP y mensaje de la web.
 * @returns El resultado de herramienta con `isError`.
 */
function fallo(result: { status: number; message: string }) {
  const codigo = result.status === 400 ? "invalid" : result.status === 403 ? "forbidden" : result.status === 404 ? "not_found" : result.status === 409 ? "conflict" : result.status === 503 ? "unavailable" : "error";
  return errorHerramienta(codigo, result.message);
}

async function listar(caller: McpCaller) {
  const result = await listarAdministradores(toChatGPTUser(caller));
  return result.ok ? payloadResult({ administradores: result.valor }) : fallo(result);
}

async function crear(caller: McpCaller, args: Record<string, unknown>) {
  const { nombre, correo } = args as { nombre?: string; correo?: string };
  const result = await crearAdministrador(toChatGPTUser(caller), { displayName: nombre, email: correo });
  return result.ok ? payloadResult({ administrador: result.valor }) : fallo(result);
}

async function actualizar(caller: McpCaller, args: Record<string, unknown>) {
  const { administradorId, revision, nombre, correo } = args as { administradorId: string; revision: number; nombre?: string; correo?: string };
  const result = await actualizarAdministrador(toChatGPTUser(caller), { id: administradorId, revision, displayName: nombre, email: correo });
  return result.ok ? payloadResult({ administrador: result.valor }) : fallo(result);
}

async function eliminar(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { administradorId: string; revision: number; confirmar?: boolean; confirmarNombre?: string };
  const user = toChatGPTUser(caller);
  const lista = await listarAdministradores(user);
  if (!lista.ok) return fallo(lista);
  const actual = lista.valor.find((ficha) => ficha.id === a.administradorId);
  if (!actual) return errorHerramienta("not_found", "La ficha ya no existe.");
  if (a.confirmar !== true) {
    return payloadResult({
      necesitaConfirmacion: true,
      herramienta: "eliminar_administrador",
      administradorId: a.administradorId,
      nombre: actual.displayName,
      correo: actual.email,
      revision: actual.revision,
      mensaje: "Esta acción eliminará la ficha de administrador y no se puede deshacer. Llama de nuevo con confirmar: true y el nombre o el correo exacto para continuar.",
    });
  }
  const confirmacion = (a.confirmarNombre ?? "").trim();
  if (confirmacion !== actual.displayName && confirmacion !== actual.email) {
    return errorHerramienta("invalid", "Escribe el nombre o el correo exacto de la ficha para confirmar la baja.");
  }
  const result = await eliminarAdministrador(user, { id: a.administradorId, revision: a.revision });
  return result.ok ? payloadResult({ eliminado: result.valor.id, nombre: actual.displayName }) : fallo(result);
}

async function listarTokens(caller: McpCaller) {
  try {
    return payloadResult({ tokens: await listMcpTokens(getD1(), caller.userId) });
  } catch {
    return errorHerramienta("unavailable", "Base de datos no disponible.");
  }
}

async function listarActividad(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { via?: "plugin" | "personal" | "oauth"; herramienta?: string; resultado?: string; proyectoId?: string; desde?: string; hasta?: string };
  const rango = rangoDeFechas(a);
  if (!rango) return errorHerramienta("invalid", "El rango de fechas no es válido.");
  const { pagina, porPagina } = paginaDesde(args);
  const user = toChatGPTUser(caller);
  try {
    const privilegiado = (await isOwner(user)) || (await isAdministrator(user));
    const { filas, total } = await consultarAuditoria({
      userId: privilegiado ? undefined : caller.userId,
      via: a.via,
      herramienta: a.herramienta,
      resultado: a.resultado,
      proyectoId: a.proyectoId,
      desde: rango.desde,
      hasta: rango.hasta,
      pagina,
      porPagina,
    });
    return payloadResult({
      actividad: filas.map((fila) => ({
        fecha: fila.created_at,
        usuarioId: fila.user_id,
        via: fila.via,
        clientId: fila.client_id,
        herramienta: fila.tool_name,
        proyectoId: fila.project_id,
        resultado: fila.result_code,
        duracionMs: fila.duration_ms,
      })),
      total,
      pagina,
      porPagina,
    });
  } catch {
    return errorHerramienta("unavailable", "Base de datos no disponible.");
  }
}

async function revocarToken(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { tokenId: string; confirmar?: boolean };
  let db: ReturnType<typeof getD1>;
  try {
    db = getD1();
  } catch {
    return errorHerramienta("unavailable", "Base de datos no disponible.");
  }
  try {
    const tokens = await listMcpTokens(db, caller.userId);
    const actual = tokens.find((token) => token.id === a.tokenId);
    if (!actual) return errorHerramienta("not_found", "Token no encontrado.");
    if (a.confirmar !== true) {
      return payloadResult({
        necesitaConfirmacion: true,
        herramienta: "revocar_token_mcp",
        tokenId: a.tokenId,
        etiqueta: actual.label,
        creadoEn: actual.createdAt,
        ultimoUso: actual.lastUsedAt,
        revocadoEn: actual.revokedAt,
        mensaje: "Esta acción revocará el token y no se puede deshacer. Si es el token que estás usando, la siguiente llamada dejará de funcionar. Llama de nuevo con confirmar: true para continuar.",
      });
    }
    const revocado = await revokeMcpToken(db, caller.userId, a.tokenId);
    return revocado ? payloadResult({ revocado: a.tokenId, etiqueta: actual.label }) : errorHerramienta("not_found", "Token no encontrado.");
  } catch {
    return errorHerramienta("unavailable", "Base de datos no disponible.");
  }
}

/** Herramientas del dominio de administración. */
export const herramientasAdministracion: McpToolDefinicion[] = [
  {
    name: "listar_administradores",
    title: "Listar administradores",
    description: "Lista las fichas de administrador de la instancia con nombre, correo, revisión y estado de cuenta. Solo el propietario o un administrador.",
    inputSchema: {},
    outputSchema: { administradores: z.array(z.record(z.unknown())) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listar,
  },
  {
    name: "crear_administrador",
    title: "Crear administrador",
    description: "Crea una ficha de administrador con nombre y correo opcional; si lleva correo, queda pendiente de aceptación. Solo el propietario o un administrador.",
    inputSchema: { nombre, correo },
    outputSchema: { administrador: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: crear,
  },
  {
    name: "actualizar_administrador",
    title: "Actualizar administrador",
    description: "Actualiza una ficha de administrador con su revisión; cambiar el correo retira el acceso anterior hasta que la cuenta vuelva a aceptar. Solo el propietario o un administrador.",
    inputSchema: {
      administradorId,
      revision: z.number().int().positive().describe("Revisión leída antes de editar"),
      nombre,
      correo,
    },
    outputSchema: { administrador: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: actualizar,
  },
  {
    name: "eliminar_administrador",
    title: "Eliminar administrador",
    description: "Elimina una ficha de administrador con su revisión. Sin `confirmar: true` devuelve un aviso; después exige el nombre o el correo exacto. Solo el propietario o un administrador.",
    inputSchema: {
      administradorId,
      revision: z.number().int().positive().describe("Revisión leída antes de eliminar"),
      confirmarNombre: z.string().trim().max(254).optional().describe("Nombre o correo exacto de la ficha para confirmar"),
      confirmar: z.boolean().optional().describe("Llama con true para eliminar tras ver el aviso"),
    },
    outputSchema: {
      eliminado: z.string().optional(),
      nombre: z.string().optional(),
      necesitaConfirmacion: z.boolean().optional(),
      herramienta: z.string().optional(),
      administradorId: z.string().optional(),
      correo: z.string().optional(),
      revision: z.number().optional(),
      mensaje: z.string().optional(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    handler: eliminar,
  },
  {
    name: "listar_tokens_mcp",
    title: "Listar tokens MCP",
    description: "Lista los tokens MCP de la propia cuenta con etiqueta, fechas y estado de revocación; nunca devuelve el secreto, el hash ni la sal.",
    inputSchema: {},
    outputSchema: { tokens: z.array(z.record(z.unknown())) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarTokens,
  },
  {
    name: "revocar_token_mcp",
    title: "Revocar token MCP",
    description: "Revoca un token MCP propio. Sin `confirmar: true` devuelve un aviso con su etiqueta y fechas; si es el token en uso, la siguiente llamada falla. No crea tokens.",
    inputSchema: {
      tokenId,
      confirmar: z.boolean().optional().describe("Llama con true para revocar tras ver el aviso"),
    },
    outputSchema: {
      revocado: z.string().optional(),
      etiqueta: z.string().optional(),
      necesitaConfirmacion: z.boolean().optional(),
      herramienta: z.string().optional(),
      tokenId: z.string().optional(),
      creadoEn: z.number().optional(),
      ultimoUso: z.number().nullable().optional(),
      revocadoEn: z.number().nullable().optional(),
      mensaje: z.string().optional(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    handler: revocarToken,
  },
  {
    name: "listar_actividad_mcp",
    title: "Listar actividad MCP",
    description: "Lista la auditoría de llamadas MCP con filtros y paginación. La cuenta ve solo sus filas; el propietario o un administrador ven toda la instancia. No devuelve argumentos ni contenidos.",
    inputSchema: {
      via: via.optional(),
      herramienta: z.string().trim().max(80).optional().describe("Nombre exacto de la herramienta"),
      resultado: z.string().trim().max(64).optional().describe("Código de resultado, por ejemplo ok o forbidden"),
      proyectoId: z.string().trim().max(80).optional().describe("Id del proyecto de la llamada"),
      desde: fecha.optional().describe("Primer día incluido (YYYY-MM-DD)"),
      hasta: fecha.optional().describe("Último día incluido (YYYY-MM-DD)"),
      pagina: z.number().int().min(1).optional(),
      porPagina: z.number().int().min(1).max(100).optional(),
    },
    outputSchema: {
      actividad: z.array(z.record(z.unknown())),
      total: z.number(),
      pagina: z.number(),
      porPagina: z.number(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarActividad,
  },
];
