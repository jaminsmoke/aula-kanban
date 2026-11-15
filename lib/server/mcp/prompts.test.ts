import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_CATALOGO } from "../../domain/mcp-catalogo";
import { MCP_PROMPTS } from "../../domain/mcp-prompts";
import { registerPrompts } from "./prompts";

describe("prompts MCP", () => {
  it("solo mencionan herramientas publicadas y tienen argumentos únicos", () => {
    const nombres = new Set(MCP_CATALOGO.map((entrada) => entrada.name));
    const muestra = { proyectoId: "11111111-1111-4111-8111-111111111111", nombres: "Ana", apps: "excalidraw" };
    const mencionadas = new Set<string>();
    for (const prompt of MCP_PROMPTS) {
      expect(prompt.tools.length).toBeGreaterThan(0);
      for (const tool of prompt.tools) expect(nombres.has(tool)).toBe(true);
      for (const message of prompt.messages(muestra)) {
        for (const match of message.content.text.matchAll(/[a-z]+(?:_[a-z]+)+/g)) mencionadas.add(match[0]);
      }
      expect(new Set(prompt.arguments.map((argument) => argument.name)).size).toBe(prompt.arguments.length);
    }
    for (const mencionada of mencionadas) expect(nombres.has(mencionada)).toBe(true);
    expect(new Set(MCP_PROMPTS.map((prompt) => prompt.name)).size).toBe(MCP_PROMPTS.length);
  });

  it("el SDK lista y sirve los mismos prompts que comparten las puertas", async () => {
    const server = new McpServer({ name: "aula-kanban", version: "0.16.0" }, { capabilities: { prompts: {} } });
    registerPrompts(server);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "prueba", version: "1.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const list = await client.listPrompts();
    expect(list.prompts.map((prompt) => prompt.name)).toEqual(MCP_PROMPTS.map((prompt) => prompt.name));

    const got = await client.getPrompt({
      name: "resumen_de_clase",
      arguments: { proyectoId: "11111111-1111-4111-8111-111111111111" },
    });
    expect(got.messages[0]).toMatchObject({ role: "user", content: { type: "text" } });
    expect(got.messages[0].content).toMatchObject({ text: expect.stringContaining("obtener_resumen_proyecto") });

    await client.close();
    await server.close();
  });
});
