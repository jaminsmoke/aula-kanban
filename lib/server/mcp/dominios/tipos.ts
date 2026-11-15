import type { ZodRawShape } from "zod";
import type { Extra, McpCaller, ToolResult } from "../contexto";

/**
 * Definición de una herramienta del catálogo MCP.
 *
 * Un módulo por dominio en `dominios/` exporta sus definiciones con nombre,
 * título, descripción, esquema, alcance y anotaciones. El registro central
 * (`lib/server/mcp/registro.ts`) deriva de ellas los conjuntos de lectura y
 * escritura, de modo que una herramienta nueva sin alcance rompe un test y
 * no puede pasar sin `mcp:write` en producción.
 */

/** Alcance OAuth que exige la herramienta. */
export type Alcance = "mcp:read" | "mcp:write";

/** Anotaciones del protocolo MCP para la herramienta. */
export type Anotaciones = {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

/** Manejador de una herramienta: recibe los argumentos ya validados. */
export type Manejador = (caller: McpCaller, args: Record<string, unknown>) => Promise<ToolResult>;

/** Manejador crudo por el registro: cuenta y argumentos ya validados. */
export type RawHandler = (args: Record<string, unknown>, extra: Extra) => Promise<ToolResult>;

/** Definición completa de una herramienta del catálogo. */
export type McpToolDefinicion = {
  /** Nombre del protocolo: verbo en infinitivo + objeto en español. */
  name: string;
  /** Título corto para clientes que lo muestren. */
  title: string;
  description: string;
  /** Esquema de entrada con argumentos en `camelCase` español. */
  inputSchema: ZodRawShape;
  /** Esquema de salida para `structuredContent` (claves del payload). */
  outputSchema: ZodRawShape;
  /** Alcance OAuth exigido: `mcp:read` o `mcp:write`. */
  scope: Alcance;
  annotations: Anotaciones;
  /** Metadatos del protocolo MCP (`_meta`), por ejemplo `ui.resourceUri`. */
  _meta?: Record<string, unknown>;
  handler: Manejador;
};

/**
 * Normaliza la paginación de un `listar_*`: `pagina` ≥ 1 y `porPagina` en
 * 1–100 con defecto 50, igual que `listar_tareas` desde la v1.
 * @param args - Argumentos recibidos de la herramienta.
 * @returns La página y el tamaño ya aplicados.
 */
export function paginaDesde(args: Record<string, unknown>): { pagina: number; porPagina: number } {
  const pagina = typeof args.pagina === "number" && Number.isInteger(args.pagina) && args.pagina >= 1 ? args.pagina : 1;
  const porPagina = typeof args.porPagina === "number" && Number.isInteger(args.porPagina) && args.porPagina >= 1 && args.porPagina <= 100 ? args.porPagina : 50;
  return { pagina, porPagina };
}

/**
 * Recorta una lista ya filtrada a la página pedida, con el total.
 * @param items - Lista completa tras aplicar los filtros.
 * @param pagina - Página pedida (desde 1).
 * @param porPagina - Tamaño de página.
 * @returns La página con `total`, `pagina` y `porPagina`.
 */
export function paginaDe<T>(items: T[], pagina: number, porPagina: number): { items: T[]; total: number; pagina: number; porPagina: number } {
  return { items: items.slice((pagina - 1) * porPagina, pagina * porPagina), total: items.length, pagina, porPagina };
}
