import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MCP_CATALOGO, MCP_DOMINIOS } from "./mcp-catalogo";
import { MCP_README_FIN, MCP_README_INICIO, mcpGuiaHerramientas, mcpListaMarkdown, mcpResumen } from "./mcp-guia";

describe("guía MCP generada", () => {
  it("agrupa todas las herramientas por dominio y sin duplicados", () => {
    const grupos = mcpGuiaHerramientas();
    expect(grupos.map((grupo) => grupo.dominio)).toEqual([...MCP_DOMINIOS]);
    const herramientas = grupos.flatMap((grupo) => grupo.herramientas);
    expect(herramientas.map((herramienta) => herramienta.name)).toEqual(MCP_CATALOGO.map((entrada) => entrada.name));
    expect(new Set(herramientas.map((herramienta) => herramienta.name)).size).toBe(MCP_CATALOGO.length);
    for (const herramienta of herramientas) expect(herramienta.role).not.toBe("");
    expect(mcpResumen()).toMatchObject({ total: 59, lectura: 26, escritura: 33, destructivas: 8, version: "0.28.0" });
  });

  it("el bloque del README coincide exactamente con el catálogo", () => {
    const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8").replace(/\r\n/g, "\n");
    const inicio = readme.indexOf(MCP_README_INICIO);
    const fin = readme.indexOf(MCP_README_FIN);
    expect(inicio).toBeGreaterThanOrEqual(0);
    expect(fin).toBeGreaterThan(inicio);
    expect(readme.slice(inicio, fin + MCP_README_FIN.length)).toBe(mcpListaMarkdown());
  });
});
