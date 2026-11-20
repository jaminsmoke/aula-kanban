import { z } from "zod";
import { validarEstadoBlockly } from "../../../domain/blockly/serialization";
import { MAX_APP_DOCUMENT_CHARS, readAppDocument, saveAppDocument } from "../../apps/app-documents";
import { errorHerramienta, payloadResult, type McpCaller } from "../contexto";
import { resolverAppEnProyecto } from "./contrato";
import type { McpToolDefinicion } from "../dominios/tipos";

/**
 * Herramientas MCP de Blockly (MCP-05D).
 *
 * La app y MCP leen y escriben la misma fila de `app_documents` con
 * `appId: "blockly"`. MCP no interpreta los bloques ni genera código: solo
 * comprueba la forma mínima `blocks.blocks[]` y guarda el objeto completo
 * para conservar los campos internos que la web necesita al recargar.
 */

const proyectoId = z.string().uuid().describe("Id del proyecto de Aula Kanban");

/**
 * Lee el programa de Blockly guardado en el proyecto.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto del programa.
 * @returns El estado serializado y su fecha, o `null` si aún no hay programa.
 */
async function leerProgramaBloques(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { proyectoId: string };
  const resolved = await resolverAppEnProyecto(caller, { proyectoId: a.proyectoId, appId: "blockly" });
  if (!resolved.ok) return resolved.resultado;

  const document = await readAppDocument(resolved.project.id, "blockly");
  return payloadResult({
    estado: document?.state ?? null,
    actualizado: document?.updatedAt ?? null,
  });
}

/**
 * Guarda el programa de Blockly del proyecto sin revisión optimista.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto y serialización completa del workspace.
 * @returns La fecha de actualización aplicada.
 */
async function guardarProgramaBloques(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { proyectoId: string; estado: unknown };
  const estado = validarEstadoBlockly(a.estado);
  if (!estado) {
    return errorHerramienta("invalid", "El estado no es una serialización válida de Blockly: falta blocks.blocks[].");
  }

  const serialized = JSON.stringify(estado);
  if (serialized.length > MAX_APP_DOCUMENT_CHARS) {
    return errorHerramienta("too_large", "El programa supera el límite de 200.000 caracteres.");
  }

  const resolved = await resolverAppEnProyecto(caller, { proyectoId: a.proyectoId, appId: "blockly", escritura: true });
  if (!resolved.ok) return resolved.resultado;

  const actualizado = await saveAppDocument({
    projectId: resolved.project.id,
    appId: "blockly",
    state: serialized,
    updatedByUserId: resolved.access.user.userId,
  });
  return payloadResult({ actualizado });
}

/** Herramientas del dominio de apps: Blockly. */
export const herramientasBlockly: McpToolDefinicion[] = [
  {
    name: "leer_programa_bloques",
    title: "Leer programa de bloques",
    description: "Lee la serialización del programa de Blockly del proyecto y su fecha de actualización; estado y actualizado son null si aún no hay programa. Requiere que Blockly esté instalada y acceso al proyecto.",
    inputSchema: { proyectoId },
    outputSchema: {
      estado: z.record(z.unknown()).nullable(),
      actualizado: z.number().int().nonnegative().nullable(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: leerProgramaBloques,
  },
  {
    name: "guardar_programa_bloques",
    title: "Guardar programa de bloques",
    description: "Guarda la serialización completa de Blockly con blocks.blocks[], conserva los campos internos y rechaza estados de más de 200.000 caracteres. No genera ni ejecuta código. Requiere permiso de escritura; los invitados no escriben y la última escritura gana.",
    inputSchema: {
      proyectoId,
      estado: z.record(z.unknown()).describe("Serialización de Blockly.serialization.workspaces.save"),
    },
    outputSchema: {
      actualizado: z.number().int().nonnegative(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: guardarProgramaBloques,
  },
];
