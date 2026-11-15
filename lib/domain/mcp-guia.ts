import { MCP_CATALOGO, MCP_CATALOG_VERSION, MCP_DOMINIOS, type McpDominio } from "./mcp-catalogo";
import { MCP_ROLES } from "./mcp-descripciones";

/** Marca el inicio del bloque del README que se genera desde el catálogo. */
export const MCP_README_INICIO = "<!-- inicio catálogo MCP: generado desde lib/domain/mcp-catalogo.ts -->";

/** Marca el fin del bloque generado del README. */
export const MCP_README_FIN = "<!-- fin catálogo MCP -->";

/** Herramienta tal como la muestra la guía. */
export type McpGuiaHerramienta = {
  name: string;
  title: string;
  scope: "mcp:read" | "mcp:write";
  role: string;
};

/** Grupo de herramientas de un dominio. */
export type McpGuiaDominio = {
  dominio: McpDominio;
  herramientas: McpGuiaHerramienta[];
};

/**
 * Agrupa las herramientas del catálogo por dominio, con su regla de rol.
 * @returns Los dominios en orden y sus herramientas.
 */
export function mcpGuiaHerramientas(): McpGuiaDominio[] {
  return MCP_DOMINIOS.map((dominio) => ({
    dominio,
    herramientas: MCP_CATALOGO.filter((entrada) => entrada.domain === dominio).map((entrada) => ({
      name: entrada.name,
      title: entrada.title,
      scope: entrada.scope,
      role: MCP_ROLES[entrada.name] ?? "",
    })),
  }));
}

/**
 * Recuento publicado del catálogo.
 * @returns Total, lectura, escritura, destructivas y versión.
 */
export function mcpResumen() {
  const lectura = MCP_CATALOGO.filter((entrada) => entrada.scope === "mcp:read").length;
  const escritura = MCP_CATALOGO.filter((entrada) => entrada.scope === "mcp:write").length;
  const destructivas = MCP_CATALOGO.filter((entrada) => entrada.annotations.destructiveHint).length;
  return { total: MCP_CATALOGO.length, lectura, escritura, destructivas, version: MCP_CATALOG_VERSION };
}

/**
 * Bloque de herramientas del README, generado desde el catálogo.
 * @returns Markdown con el recuento y cada herramienta con su permiso.
 */
export function mcpListaMarkdown(): string {
  const resumen = mcpResumen();
  const lineas = [
    MCP_README_INICIO,
    `**${resumen.total} herramientas · catálogo \`${resumen.version}\`:** ${resumen.lectura} de lectura y ${resumen.escritura} de escritura; ${resumen.destructivas} destructivas.`,
    "",
  ];
  for (const { dominio, herramientas } of mcpGuiaHerramientas()) {
    lineas.push(`**${dominio}**`, "");
    for (const herramienta of herramientas) {
      lineas.push(`- **\`${herramienta.name}\`** — ${herramienta.title}. ${herramienta.role}`);
    }
    lineas.push("");
  }
  lineas.push(MCP_README_FIN);
  return lineas.join("\n");
}
