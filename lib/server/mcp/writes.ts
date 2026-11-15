import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_TOOLS, WRITE_TOOL_NAMES, registerTools } from "./registro";

/**
 * Herramientas de escritura del catálogo (reexportado para compatibilidad).
 *
 * Las definiciones y los manejadores viven en `dominios/tareas.ts` y el
 * registro central en `registro.ts`; esta función registra solo la
 * escritura en el servidor SDK.
 */

/**
 * Registra las herramientas de escritura del contrato.
 * @param server - Servidor MCP en el que registrarlas.
 */
export function registerWriteTools(server: McpServer) {
  registerTools(server, MCP_TOOLS.filter((tool) => WRITE_TOOL_NAMES.has(tool.name)));
}
