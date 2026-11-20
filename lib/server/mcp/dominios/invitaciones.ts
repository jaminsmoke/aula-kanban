import { z } from "zod";
import { acceptInvitation, listPendingInvitations } from "../../access/invitaciones";
import { errorHerramienta, payloadResult, toChatGPTUser, type McpCaller } from "../contexto";
import type { McpToolDefinicion } from "./tipos";

/**
 * Dominio de invitaciones (MCP-01): las pendientes de la cuenta y su
 * aceptación, con la misma lógica que `/api/invitations`
 * (`lib/server/invitaciones.ts`). Invitar no envía correo: la persona
 * acepta desde su propia cuenta.
 */

async function listarInvitaciones(caller: McpCaller) {
  const pendientes = await listPendingInvitations(toChatGPTUser(caller));
  return payloadResult({
    invitaciones: pendientes.map((item) => ({
      id: item.id,
      proyectoId: item.projectId,
      nombreProyecto: item.projectName,
      rol: item.role,
      ambito: item.scope,
    })),
  });
}

async function aceptarInvitacion(caller: McpCaller, args: Record<string, unknown>) {
  const { id, ambito } = args as { id: string; ambito: "project" | "site" };
  const result = await acceptInvitation(toChatGPTUser(caller), id, ambito);
  if (!result.ok) return errorHerramienta(result.codigo, result.mensaje);
  return payloadResult({ aceptada: true, proyectoId: result.projectId, ambito: result.scope });
}

/** Herramientas del dominio de invitaciones. */
export const herramientasInvitaciones: McpToolDefinicion[] = [
  {
    name: "listar_invitaciones_pendientes",
    title: "Invitaciones pendientes",
    description: "Lista las invitaciones pendientes de la cuenta autenticada, de proyecto y de administración del sitio.",
    inputSchema: {},
    outputSchema: { invitaciones: z.array(z.record(z.unknown())) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarInvitaciones,
  },
  {
    name: "aceptar_invitacion",
    title: "Aceptar invitación",
    description: "Acepta una invitación pendiente de la cuenta autenticada. Falla con 404 si ya no es para esta cuenta y con 409 si ya pertenece al proyecto.",
    inputSchema: {
      id: z.string().uuid().describe("Identificador de la invitación"),
      ambito: z.enum(["project", "site"]).describe("Ámbito de la invitación"),
    },
    outputSchema: { aceptada: z.boolean(), proyectoId: z.string().nullable(), ambito: z.string() },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: aceptarInvitacion,
  },
];
