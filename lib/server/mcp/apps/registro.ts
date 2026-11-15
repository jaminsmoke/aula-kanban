import type { NativeAppId } from "../../../native-apps";
import type { McpToolDefinicion } from "../dominios/tipos";

/**
 * Manifiesto MCP de las apps nativas (MCP-05A).
 *
 * Cada app del catálogo debe tener una entrada, aunque todavía no exponga
 * herramientas. El test de cobertura falla si se añade una app a
 * `NATIVE_APP_IDS` sin decidir su superficie MCP.
 */
export type AppMcpDeclaracion = {
  appId: NativeAppId;
  herramientas: McpToolDefinicion[];
  /** Motivo por el que aún no hay herramientas; obligatorio si la lista está vacía. */
  pendiente?: string;
};

/** Declaraciones por app, en el orden del catálogo de Aula Store. */
export const APP_MCP_DECLARACIONES: Record<NativeAppId, AppMcpDeclaracion> = {
  excalidraw: {
    appId: "excalidraw",
    herramientas: [],
    pendiente: "MCP-05B",
  },
  "edu-tools": {
    appId: "edu-tools",
    herramientas: [],
    pendiente: "MCP-05C (fase 2 del roadmap activo)",
  },
  blockly: {
    appId: "blockly",
    herramientas: [],
    pendiente: "MCP-05D",
  },
  mermaid: {
    appId: "mermaid",
    herramientas: [],
    pendiente: "MCP-05E",
  },
};

/** Herramientas de todas las apps, en el orden de sus declaraciones. */
export const herramientasDeApps: McpToolDefinicion[] = Object.values(APP_MCP_DECLARACIONES)
  .flatMap((declaracion) => declaracion.herramientas);
