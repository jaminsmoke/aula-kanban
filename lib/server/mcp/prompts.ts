import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MCP_PROMPTS } from "../../domain/mcp-prompts";

/**
 * Registra los prompts compartidos en un servidor MCP.
 * @param server - Servidor de `/api/mcp` en el que registrarlos.
 */
export function registerPrompts(server: McpServer) {
  for (const prompt of MCP_PROMPTS) {
    const argsSchema: z.ZodRawShape = {};
    for (const argument of prompt.arguments) {
      argsSchema[argument.name] = argument.required ? z.string().min(1) : z.string().optional();
    }
    server.registerPrompt(
      prompt.name,
      { title: prompt.title, description: prompt.description, argsSchema },
      async (args) => ({ messages: prompt.messages(args as Record<string, string | undefined>) }),
    );
  }
}
