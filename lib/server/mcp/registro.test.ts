import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_TOOLS, pluginCatalog, READ_TOOL_NAMES, registerTools, toolsListEntries, WRITE_TOOL_NAMES } from "./registro";

/**
 * Contrato del catálogo (MCP-12): snapshot de las 8 herramientas con sus
 * esquemas, anotaciones y alcance; igualdad entre las dos puertas; e
 * invariantes que rompen si una herramienta pierde su alcance o una
 * anotación.
 */

function resumen() {
  return MCP_TOOLS.map((tool) => ({
    name: tool.name,
    title: tool.title,
    scope: tool.scope,
    annotations: tool.annotations,
    inputSchema: JSON.parse(JSON.stringify(zodToJsonSchema(z.object(tool.inputSchema), { target: "jsonSchema7" }))),
    outputSchema: JSON.parse(JSON.stringify(zodToJsonSchema(z.object(tool.outputSchema), { target: "jsonSchema7" }))),
  }));
}

describe("contrato del catálogo MCP", () => {
  it("mantiene las herramientas del catálogo, en orden por dominio", () => {
    expect(MCP_TOOLS.map((tool) => tool.name)).toEqual([
      "listar_proyectos",
      "crear_proyecto",
      "eliminar_proyecto",
      "subir_archivo",
      "obtener_archivo",
      "listar_tareas",
      "obtener_tarea",
      "crear_tarea",
      "actualizar_tarea",
      "mover_tarea",
      "asignar_tarea",
      "desasignar_tarea",
      "reprogramar_tarea",
      "listar_calendario",
      "eliminar_tarea",
      "listar_alumnos",
      "listar_profesores",
      "obtener_alumno",
      "obtener_profesor",
      "listar_miembros",
      "invitar_miembro",
      "retirar_miembro",
      "crear_alumno",
      "crear_profesor",
      "actualizar_alumno",
      "actualizar_profesor",
      "eliminar_alumno",
      "eliminar_profesor",
      "quien_soy",
      "obtener_enlace",
      "abrir_app",
      "obtener_resumen_proyecto",
      "listar_invitaciones_pendientes",
      "aceptar_invitacion",
      "listar_apps",
      "obtener_app",
      "instalar_app",
      "desinstalar_app",
      "consultar_elemento",
      "listar_ventanas",
      "cerrar_app",
      "minimizar_app",
      "restaurar_app",
      "ampliar_app",
      "listar_administradores",
      "crear_administrador",
      "actualizar_administrador",
      "eliminar_administrador",
      "listar_tokens_mcp",
      "revocar_token_mcp",
      "listar_actividad_mcp",
    ]);
  });

  it("fija el snapshot del catálogo (nombres, esquemas, anotaciones y alcance)", () => {
    expect(resumen()).toMatchSnapshot();
  });

  it("toda herramienta tiene alcance y los conjuntos lo cubren sin solaparse", () => {
    for (const tool of MCP_TOOLS) {
      expect(["mcp:read", "mcp:write"]).toContain(tool.scope);
    }
    const all = new Set(MCP_TOOLS.map((tool) => tool.name));
    const union = new Set([...READ_TOOL_NAMES, ...WRITE_TOOL_NAMES]);
    expect(union).toEqual(all);
    for (const name of READ_TOOL_NAMES) {
      expect(WRITE_TOOL_NAMES.has(name)).toBe(false);
    }
    expect(READ_TOOL_NAMES.size + WRITE_TOOL_NAMES.size).toBe(MCP_TOOLS.length);
  });

  it("toda herramienta declara las cuatro anotaciones", () => {
    for (const tool of MCP_TOOLS) {
      expect(tool.annotations).toEqual({
        readOnlyHint: expect.any(Boolean),
        destructiveHint: expect.any(Boolean),
        idempotentHint: expect.any(Boolean),
        openWorldHint: false,
      });
    }
  });

  it("abrir_app declara la UI del chat (SEP-1865) y la puerta del plugin la expone", () => {
    const abrir = MCP_TOOLS.find((tool) => tool.name === "abrir_app");
    expect(abrir?._meta).toEqual({ ui: { resourceUri: "ui://aula-espacio/apertura" } });
    const entrada = toolsListEntries().find((tool) => tool.name === "abrir_app");
    expect((entrada as { _meta?: unknown })._meta).toEqual({ ui: { resourceUri: "ui://aula-espacio/apertura" } });
  });

  it("toda herramienta destructiva exige confirmación en su esquema", () => {
    const destructivas = MCP_TOOLS.filter((tool) => tool.annotations.destructiveHint === true);
    expect(destructivas.map((tool) => tool.name)).toEqual(["eliminar_proyecto", "eliminar_tarea", "retirar_miembro", "eliminar_alumno", "eliminar_profesor", "desinstalar_app", "eliminar_administrador", "revocar_token_mcp"]);
    for (const tool of destructivas) {
      expect(tool.inputSchema).toHaveProperty("confirmar");
      expect(tool.scope).toBe("mcp:write");
    }
  });

  it("las dos puertas listan el mismo catálogo", async () => {
    // La puerta del plugin serializa `toolsListEntries()` (con la misma
    // conversión a JSON Schema que la ruta) y el SDK lista sus registros.
    const pluginTools = new Map(
      toolsListEntries().map((entry) => [
        entry.name,
        {
          name: entry.name,
          title: entry.title,
          description: entry.description,
          inputSchema: JSON.parse(JSON.stringify(zodToJsonSchema(z.object(entry.inputSchema), { target: "jsonSchema7" }))),
          outputSchema: JSON.parse(JSON.stringify(zodToJsonSchema(z.object(entry.outputSchema), { target: "jsonSchema7" }))),
          annotations: entry.annotations,
        },
      ]),
    );

    const server = new McpServer({ name: "aula-kanban", version: "0.2.0" });
    registerTools(server);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    try {
      const listed = await client.listTools();
      const sdkTools = new Map(listed.tools.map((tool) => [tool.name, tool as unknown as Record<string, unknown>]));
      expect([...sdkTools.keys()].sort()).toEqual([...pluginTools.keys()].sort());
      const schemaDe = (value: unknown) => {
        // `additionalProperties`/`$schema` lo escribe cada puerta a su manera;
        // lo que debe coincidir es el contrato: tipo y properties.
        const { additionalProperties: _a, $schema: _s, ...rest } = value as Record<string, unknown>;
        return rest;
      };
      for (const [name, sdkTool] of sdkTools) {
        const pluginTool = pluginTools.get(name) as Record<string, unknown>;
        expect(pluginTool.title).toBe(sdkTool.title);
        expect(pluginTool.description).toBe(sdkTool.description);
        expect(schemaDe(pluginTool.inputSchema)).toEqual(schemaDe(sdkTool.inputSchema));
        expect(schemaDe(pluginTool.outputSchema)).toEqual(schemaDe(sdkTool.outputSchema));
        expect(pluginTool.annotations).toEqual(sdkTool.annotations);
      }
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("el catálogo del plugin expone anotaciones y esquemas para cada herramienta", () => {
    const entries = toolsListEntries();
    expect(entries).toHaveLength(MCP_TOOLS.length);
    expect(pluginCatalog().size).toBe(MCP_TOOLS.length);
    for (const entry of entries) {
      expect(entry.annotations.openWorldHint).toBe(false);
      // Sin argumentos: `quien_soy`, invitaciones y el listado de administradores no los tienen.
      if (entry.name !== "quien_soy" && entry.name !== "listar_invitaciones_pendientes" && entry.name !== "listar_administradores" && entry.name !== "listar_tokens_mcp") {
        expect(Object.keys(entry.inputSchema)).not.toHaveLength(0);
      }
      expect(Object.keys(entry.outputSchema)).not.toHaveLength(0);
    }
  });
});
