import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_TOOLS, READ_TOOL_NAMES, registerTools } from "./registro";

/**
 * Herramientas de lectura del catálogo (reexportado para compatibilidad).
 *
 * Las definiciones y los manejadores viven en `dominios/` y el registro
 * central en `registro.ts`; esta función registra solo la lectura en el
 * servidor SDK. Ambas puertas (`/mcp` y `/api/mcp`) usan el mismo catálogo.
 */

export { payloadResult, toolError, errorHerramienta, falloResolucion, callerFromExtra, toChatGPTUser, resolve, CODIGO_ESTADO } from "./contexto";
export type { McpCaller, ToolResult, Extra, Resolved, CodigoError } from "./contexto";

/**
 * Registra las herramientas de lectura del contrato.
 * @param server - Servidor MCP en el que registrarlas.
 */
export function registerReadTools(server: McpServer) {
  registerTools(server, MCP_TOOLS.filter((tool) => READ_TOOL_NAMES.has(tool.name)));
}
