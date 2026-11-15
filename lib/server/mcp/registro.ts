import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callerFromExtra, errorHerramienta, type Extra, type ToolResult } from "./contexto";
import { registrarAuditoria } from "./auditoria";
import { checkMcpRateLimit, MCP_WRITE_RATE_MAX } from "./rate-limit";
import { herramientasAdministracion } from "./dominios/administracion";
import { herramientasApps } from "./dominios/apps";
import { herramientasDeApps } from "./apps/registro";
import { herramientasContexto } from "./dominios/contexto";
import { herramientasVentanas } from "./dominios/ventanas";
import { herramientasInvitaciones } from "./dominios/invitaciones";
import { herramientasPersonas } from "./dominios/personas";
import { herramientasProyectos } from "./dominios/proyectos";
import { herramientasArchivos } from "./dominios/archivos";
import { herramientasTareas } from "./dominios/tareas";
import type { McpToolDefinicion, RawHandler } from "./dominios/tipos";
import { metaDeHerramienta } from "../../domain/mcp-catalogo";
import { descripcionConEjemplo } from "../../domain/mcp-descripciones";

export { listarRecursosUi, leerRecursoUi, registrarRecursosUi } from "./ui-apertura";

/**
 * Registro central del catálogo MCP: un solo catálogo, dos puertas.
 *
 * `/mcp` (plugin, JSON-RPC propio) y `/api/mcp` (SDK con tokens/OAuth)
 * registran las mismas definiciones de `dominios/` y mapean los errores
 * igual. Los conjuntos de lectura/escritura derivan de cada definición,
 * así que una herramienta nueva con alcance olvidado rompe un test y no
 * puede cruzar `/api/mcp` sin `mcp:write`.
 */

/** Definiciones por dominio: esquemas y manejadores, en orden de alta. */
const DEFINICIONES: McpToolDefinicion[] = [
  ...herramientasProyectos,
  ...herramientasArchivos,
  ...herramientasTareas,
  ...herramientasPersonas,
  ...herramientasContexto,
  ...herramientasInvitaciones,
  ...herramientasApps,
  ...herramientasDeApps,
  ...herramientasVentanas,
  ...herramientasAdministracion,
];

/**
 * Aplica los metadatos públicos del catálogo puro a una definición.
 * @param definicion - Definición con esquemas y manejador.
 * @returns La definición con nombre, título, descripción, alcance y anotaciones del catálogo.
 */
function conMetadatos(definicion: McpToolDefinicion): McpToolDefinicion {
  const metadatos = metaDeHerramienta(definicion.name);
  if (!metadatos) throw new Error(`La herramienta ${definicion.name} no está en el catálogo público.`);
  return { ...definicion, ...metadatos, description: descripcionConEjemplo(definicion.name, metadatos.description) };
}

/** Todas las definiciones del catálogo, con los metadatos de `lib/domain/mcp-catalogo.ts`. */
export const MCP_TOOLS: McpToolDefinicion[] = DEFINICIONES.map(conMetadatos);

/** Herramientas de lectura (exigen `mcp:read` con tokens OAuth). */
export const READ_TOOL_NAMES: ReadonlySet<string> = new Set(MCP_TOOLS.filter((tool) => tool.scope === "mcp:read").map((tool) => tool.name));

/** Herramientas de escritura (exigen `mcp:write` con tokens OAuth). */
export const WRITE_TOOL_NAMES: ReadonlySet<string> = new Set(MCP_TOOLS.filter((tool) => tool.scope === "mcp:write").map((tool) => tool.name));

/** Versión del catálogo: sube en cada cambio de herramientas. */
export { MCP_CATALOG_VERSION } from "../../domain/mcp-catalogo";

/** Texto de instrucciones que ambas puertas anuncian al conectar. */
export { MCP_INSTRUCTIONS } from "./instrucciones";

/**
 * Alcance que exige una herramienta, o `null` si no es del contrato.
 * @param name - Nombre de la herramienta de `tools/call`.
 * @returns `mcp:read`, `mcp:write` o `null`.
 */
export function scopeForTool(name: string): McpToolDefinicion["scope"] | null {
  return MCP_TOOLS.find((tool) => tool.name === name)?.scope ?? null;
}

/**
 * Resultado de auditoría de una llamada ya ejecutada.
 * @param result - Resultado devuelto por el manejador.
 * @returns `ok` o el código de error.
 */
function resultadoDe(result: ToolResult): string {
  if (!result.isError) return "ok";
  const error = result.structuredContent?.error as { codigo?: string } | undefined;
  return error?.codigo ?? "error";
}

/**
 * Envuelve el manejador de una herramienta con límites y auditoría.
 * El plugin (`via: plugin`) limita por `userId` (120/min general y 30/min
 * para escrituras); `/api/mcp` ya limita por token en HTTP antes de llegar.
 * @param definicion - Definición de la herramienta.
 * @returns El manejador con límites y auditoría aplicados.
 */
function envolver(definicion: McpToolDefinicion): RawHandler {
  return async (args, extra) => {
    const caller = callerFromExtra(extra);
    const inicio = Date.now();
    let result: ToolResult;
    if (!caller) {
      result = errorHerramienta("unauthenticated", "Se necesita una cuenta válida del token.");
    } else if (caller.via === "plugin" && !checkPluginLimit(caller.userId, definicion.scope)) {
      result = errorHerramienta("rate_limited", "Demasiadas peticiones. Inténtalo de nuevo en un minuto.");
    } else {
      try {
        result = await definicion.handler(caller, args);
      } catch {
        result = errorHerramienta("error", "No se pudo completar la operación.");
      }
    }
    if (caller) {
      await registrarAuditoria({
        userId: caller.userId,
        via: caller.via ?? "personal",
        clientId: caller.clientId ?? null,
        herramienta: definicion.name,
        proyectoId: typeof args.proyectoId === "string" ? args.proyectoId : null,
        resultado: resultadoDe(result),
        duracionMs: Date.now() - inicio,
      });
    }
    return result;
  };
}

/**
 * Límite del plugin por cuenta: 120/min en general y 30/min en escrituras.
 * @param userId - Cuenta autenticada del plugin.
 * @param scope - Alcance de la herramienta.
 * @returns `true` si cabe dentro de los límites.
 */
function checkPluginLimit(userId: string, scope: McpToolDefinicion["scope"]): boolean {
  if (!checkMcpRateLimit(`plugin:${userId}`)) return false;
  if (scope === "mcp:write" && !checkMcpRateLimit(`plugin:${userId}:write`, Date.now(), MCP_WRITE_RATE_MAX)) return false;
  return true;
}

/**
 * Registra las herramientas del catálogo en el servidor MCP.
 * @param server - Servidor MCP en el que registrarlas.
 * @param tools - Definiciones a registrar (todas si se omite).
 */
export function registerTools(server: McpServer, tools: McpToolDefinicion[] = MCP_TOOLS) {
  for (const definicion of tools) {
    const handler = envolver(definicion);
    server.registerTool(
      definicion.name,
      {
        title: definicion.title,
        description: definicion.description,
        inputSchema: definicion.inputSchema,
        outputSchema: definicion.outputSchema,
        annotations: definicion.annotations,
        ...(definicion._meta ? { _meta: definicion._meta } : {}),
      },
      async (args: Record<string, unknown>, extra: Extra) => handler(args, extra),
    );
  }
}

/**
 * Entradas de `tools/list` con anotaciones y esquemas, para el plugin.
 * @returns Las herramientas con nombre, descripción y esquemas en JSON.
 */
export function toolsListEntries() {
  return MCP_TOOLS.map((definicion) => ({
    name: definicion.name,
    title: definicion.title,
    description: definicion.description,
    inputSchema: definicion.inputSchema,
    outputSchema: definicion.outputSchema,
    annotations: definicion.annotations,
    ...(definicion._meta ? { _meta: definicion._meta } : {}),
  }));
}

/**
 * Construye el catálogo del plugin como mapa nombre → herramienta.
 * @returns Las herramientas indexadas por nombre, con su manejador envuelto.
 */
export function pluginCatalog(): Map<
  string,
  {
    name: string;
    description: string;
    inputSchema: z.ZodRawShape;
    outputSchema: z.ZodRawShape;
    annotations: McpToolDefinicion["annotations"];
    handler: RawHandler;
  }
> {
  return new Map(
    MCP_TOOLS.map((definicion) => [
      definicion.name,
      {
        name: definicion.name,
        description: definicion.description,
        inputSchema: definicion.inputSchema,
        outputSchema: definicion.outputSchema,
        annotations: definicion.annotations,
        handler: envolver(definicion),
      },
    ]),
  );
}
