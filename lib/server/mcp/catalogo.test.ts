import { describe, expect, it } from "vitest";
import { MCP_CATALOGO, metaDeHerramienta } from "../../domain/mcp-catalogo";
import { MCP_EJEMPLOS, MCP_ROLES, descripcionConEjemplo } from "../../domain/mcp-descripciones";
import { herramientasAdministracion } from "./dominios/administracion";
import { herramientasArchivos } from "./dominios/archivos";
import { herramientasApps } from "./dominios/apps";
import { herramientasContexto } from "./dominios/contexto";
import { herramientasInvitaciones } from "./dominios/invitaciones";
import { herramientasPersonas } from "./dominios/personas";
import { herramientasProyectos } from "./dominios/proyectos";
import { herramientasTareas } from "./dominios/tareas";
import { herramientasVentanas } from "./dominios/ventanas";
import { MCP_TOOLS } from "./registro";

const DEFINICIONES = [
  ...herramientasProyectos,
  ...herramientasArchivos,
  ...herramientasTareas,
  ...herramientasPersonas,
  ...herramientasContexto,
  ...herramientasInvitaciones,
  ...herramientasApps,
  ...herramientasVentanas,
  ...herramientasAdministracion,
];

const metadatos = (definicion: (typeof DEFINICIONES)[number]) => ({
  name: definicion.name,
  title: definicion.title,
  description: definicion.description,
  scope: definicion.scope,
  annotations: definicion.annotations,
});

const metadatosBase = (entrada: { name: string; title: string; description: string; scope: "mcp:read" | "mcp:write"; annotations: unknown }) => ({
  name: entrada.name,
  title: entrada.title,
  description: entrada.description,
  scope: entrada.scope,
  annotations: entrada.annotations,
});

describe("catálogo público MCP", () => {
  it("cubre exactamente las definiciones, sin nombres repetidos", () => {
    expect(MCP_CATALOGO.map((entrada) => entrada.name)).toEqual(DEFINICIONES.map((definicion) => definicion.name));
    expect(new Set(MCP_CATALOGO.map((entrada) => entrada.name)).size).toBe(MCP_CATALOGO.length);
  });

  it("el registro publica los metadatos con ejemplo y permisos", () => {
    for (const [index, entrada] of MCP_CATALOGO.entries()) {
      expect(MCP_TOOLS[index]).toMatchObject({
        ...entrada,
        description: descripcionConEjemplo(entrada.name, entrada.description),
      });
      expect(MCP_TOOLS[index].description).toContain("Ejemplo de argumentos:");
      expect(MCP_TOOLS[index].description).toContain("Permisos:");
    }
  });

  it("cada herramienta tiene un ejemplo JSON y una regla de rol, sin sobrantes", () => {
    const nombres = MCP_CATALOGO.map((entrada) => entrada.name).sort();
    expect(Object.keys(MCP_EJEMPLOS).sort()).toEqual(nombres);
    expect(Object.keys(MCP_ROLES).sort()).toEqual(nombres);
    for (const nombre of nombres) expect(() => JSON.parse(MCP_EJEMPLOS[nombre])).not.toThrow();
  });

  it("las definiciones no declaran metadatos base divergentes", () => {
    for (const definicion of DEFINICIONES) {
      const entrada = metaDeHerramienta(definicion.name);
      expect(entrada).toBeDefined();
      expect(metadatos(definicion)).toEqual(metadatosBase(entrada!));
    }
  });
});
