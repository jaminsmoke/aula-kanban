import { z } from "zod";
import {
  DOCUMENT_SUITE_LEGACY_APP_IDS,
  NATIVE_APP_IDS,
  resolveAppRouteId,
} from "../../../native-apps";
import { listInstalledApps } from "../../apps";
import { comandarVentana, ventanasDe } from "../../space-control";
import { errorHerramienta, falloResolucion, payloadResult, resolve, toChatGPTUser, type McpCaller } from "../contexto";
import { enlace } from "../enlaces";
import type { McpToolDefinicion } from "./tipos";

/**
 * Dominio de ventanas en vivo de Tienda (Fase 2 de MCP-04): lista las
 * ventanas abiertas en las pestañas conectadas de la propia cuenta y envía
 * comandos de control (cerrar/minimizar/restaurar/ampliar) por el canal
 * `space`. Sin pestañas conectadas las herramientas devuelven el enlace del
 * paso A en vez de fallar.
 */

const projectId = z.string().uuid().describe("Id del proyecto de Aula Kanban");
const appIdSchema = z.enum([
  ...NATIVE_APP_IDS,
  ...DOCUMENT_SUITE_LEGACY_APP_IDS,
] as unknown as [string, ...string[]]).describe("App de Tienda; los ids documentales antiguos abren Aula Documentos");

type ControlArgs = { proyectoId: string; appId: string };

async function listarVentanas(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId } = args as { proyectoId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const estado = await ventanasDe(proyectoId, caller.userId);
  return payloadResult({
    conectadas: estado !== null,
    ventanas: estado ?? [],
    enlace: enlace(caller.origen, proyectoId, "administracion", "tareas", "cuenta", undefined, "tienda"),
  });
}

/**
 * Construye el manejador de un comando de ventana.
 * @param accion - Acción de control (`cerrar | minimizar | restaurar | ampliar`).
 * @returns El manejador de la herramienta.
 */
function controlar(accion: "cerrar" | "minimizar" | "restaurar" | "ampliar") {
  return async (caller: McpCaller, args: Record<string, unknown>) => {
    const { proyectoId, appId: rawAppId } = args as ControlArgs;
    const appId = resolveAppRouteId(rawAppId);
    const resolved = await resolve(toChatGPTUser(caller), proyectoId);
    if (!resolved.ok) return falloResolucion(resolved);
    const instalada = (await listInstalledApps()).some((estado) => estado.id === appId && estado.status === "installed");
    if (!instalada) return errorHerramienta("not_found", "La aplicación no está instalada");
    const resultado = await comandarVentana(proyectoId, caller.userId, accion, appId);
    return payloadResult({
      appId,
      ventana_conectada: resultado.conectada,
      ventana_entregada: resultado.entregada,
      enlace: enlace(caller.origen, proyectoId, "administracion", "tareas", "cuenta", appId, "tienda"),
    });
  };
}

/** Herramientas del dominio de ventanas en vivo. */
export const herramientasVentanas: McpToolDefinicion[] = [
  {
    name: "listar_ventanas",
    title: "Listar ventanas",
    description: "Lista las ventanas abiertas en las pestañas conectadas de la propia cuenta en Tienda. Sin pestañas conectadas devuelve conectadas: false y el enlace a Tienda.",
    inputSchema: { proyectoId: projectId },
    outputSchema: {
      conectadas: z.boolean(),
      ventanas: z.array(z.record(z.unknown())),
      enlace: z.string(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarVentanas,
  },
  {
    name: "cerrar_app",
    title: "Cerrar app",
    description: "Cierra la ventana abierta de la app en las pestañas conectadas de la propia cuenta (idempotente). Sin pestaña conectada devuelve ventana_entregada: false y el enlace.",
    inputSchema: { proyectoId: projectId, appId: appIdSchema },
    outputSchema: { appId: z.string(), ventana_conectada: z.boolean(), ventana_entregada: z.boolean(), enlace: z.string() },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: controlar("cerrar"),
  },
  {
    name: "minimizar_app",
    title: "Minimizar app",
    description: "Minimiza la ventana abierta de la app en las pestañas conectadas de la propia cuenta (idempotente). Sin pestaña conectada devuelve ventana_entregada: false y el enlace.",
    inputSchema: { proyectoId: projectId, appId: appIdSchema },
    outputSchema: { appId: z.string(), ventana_conectada: z.boolean(), ventana_entregada: z.boolean(), enlace: z.string() },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: controlar("minimizar"),
  },
  {
    name: "restaurar_app",
    title: "Restaurar app",
    description: "Restaura la ventana minimizada de la app en las pestañas conectadas de la propia cuenta (idempotente). Sin pestaña conectada devuelve ventana_entregada: false y el enlace.",
    inputSchema: { proyectoId: projectId, appId: appIdSchema },
    outputSchema: { appId: z.string(), ventana_conectada: z.boolean(), ventana_entregada: z.boolean(), enlace: z.string() },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: controlar("restaurar"),
  },
  {
    name: "ampliar_app",
    title: "Ampliar app",
    description: "Amplía la ventana de la app a pantalla completa en las pestañas conectadas de la propia cuenta (idempotente). Sin pestaña conectada devuelve ventana_entregada: false y el enlace.",
    inputSchema: { proyectoId: projectId, appId: appIdSchema },
    outputSchema: { appId: z.string(), ventana_conectada: z.boolean(), ventana_entregada: z.boolean(), enlace: z.string() },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: controlar("ampliar"),
  },
];
