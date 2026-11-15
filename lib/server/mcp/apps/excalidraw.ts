import { z } from "zod";
import {
  BOARD_INVALID,
  BOARD_OWNER_TYPES,
  MAX_BOARD_SNAPSHOT_BYTES,
  readBoard,
  saveBoard,
  type BoardFailure,
  type BoardOwnerType,
} from "../../boards";
import { errorHerramienta, payloadResult, type McpCaller } from "../contexto";
import { resolverAppEnProyecto } from "./contrato";
import type { McpToolDefinicion } from "../dominios/tipos";

/**
 * Herramientas MCP de Excalidraw (MCP-05B).
 *
 * La persistencia y los permisos viven en `lib/server/boards.ts`; estas
 * herramientas solo adaptan el contrato MCP a la pizarra. La app y MCP leen
 * y escriben la misma fila de `boards`.
 */

const proyectoId = z.string().uuid().describe("Id del proyecto de Aula Kanban");
const tipo = z.enum(BOARD_OWNER_TYPES).describe("Tipo de pizarra: task, project o space");
const duenoId = z.string().min(1).max(80).describe("Id de la tarea o del proyecto dueño de la pizarra");

/**
 * Traduce el fallo del servicio de pizarras al contrato MCP.
 * @param result - Fallo de dueño, permiso, tamaño o conflicto.
 * @returns El resultado con el código MCP equivalente.
 */
function errorDePizarra(result: BoardFailure) {
  const codigo = result.status === 409 ? "conflict"
    : result.status === 403 ? "forbidden"
      : result.status === 404 ? "not_found"
        : "invalid";
  return errorHerramienta(codigo, result.message, result.revisionActual === undefined ? undefined : { revisionActual: result.revisionActual });
}

/**
 * Comprueba que el snapshot sea un objeto JSON con una lista de elementos.
 * @param snapshot - Snapshot serializado recibido por MCP.
 * @returns `true` si la escena tiene la forma mínima que espera Excalidraw.
 */
function snapshotValido(snapshot: string) {
  try {
    const parsed = JSON.parse(snapshot) as { elements?: unknown } | null;
    return Boolean(parsed && typeof parsed === "object" && Array.isArray(parsed.elements));
  } catch {
    return false;
  }
}

/**
 * Lee una pizarra de Excalidraw.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto, tipo y dueño de la pizarra.
 * @returns Snapshot, revisión y fecha de actualización.
 */
async function leerPizarra(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { proyectoId: string; tipo: BoardOwnerType; duenoId: string };
  const resolved = await resolverAppEnProyecto(caller, { proyectoId: a.proyectoId, appId: "excalidraw" });
  if (!resolved.ok) return resolved.resultado;

  const result = await readBoard(resolved.project.id, a.tipo, a.duenoId);
  if (!result.ok) return errorDePizarra(result);
  return payloadResult({
    snapshot: result.value.snapshot,
    revision: result.value.revision,
    updatedAt: result.value.updatedAt,
  });
}

/**
 * Guarda una pizarra de Excalidraw con revisión optimista.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto, tipo, dueño, snapshot y revisión esperada.
 * @returns La revisión y la fecha guardadas.
 */
async function guardarPizarra(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as {
    proyectoId: string;
    tipo: BoardOwnerType;
    duenoId: string;
    snapshot: string;
    revision: number;
  };
  if (a.snapshot.length > MAX_BOARD_SNAPSHOT_BYTES) return errorHerramienta("invalid", BOARD_INVALID);
  if (!snapshotValido(a.snapshot)) {
    return errorHerramienta("invalid", "El snapshot no es un JSON válido con una lista elements.");
  }

  const resolved = await resolverAppEnProyecto(caller, { proyectoId: a.proyectoId, appId: "excalidraw", escritura: true });
  if (!resolved.ok) return resolved.resultado;

  const result = await saveBoard({
    projectId: resolved.project.id,
    access: resolved.access,
    ownerType: a.tipo,
    ownerId: a.duenoId,
    snapshot: a.snapshot,
    revision: a.revision,
  });
  if (!result.ok) return errorDePizarra(result);
  return payloadResult({ revision: result.value.revision, updatedAt: result.value.updatedAt });
}

/** Herramientas del dominio de apps: Excalidraw. */
export const herramientasExcalidraw: McpToolDefinicion[] = [
  {
    name: "leer_pizarra",
    title: "Leer pizarra",
    description: "Lee el snapshot, la revisión y la fecha de una pizarra de Excalidraw de tarea, proyecto o Mi espacio. Requiere que Excalidraw esté instalada y acceso al proyecto.",
    inputSchema: { proyectoId, tipo, duenoId },
    outputSchema: {
      snapshot: z.string(),
      revision: z.number().int().nonnegative(),
      updatedAt: z.number().int().nonnegative(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: leerPizarra,
  },
  {
    name: "guardar_pizarra",
    title: "Guardar pizarra",
    description: "Guarda el snapshot de una pizarra de Excalidraw con la revisión leída. Falla con conflict y la revisión actual si otra sesión guardó antes. Requiere permiso de escritura; invitados no escriben y el alumnado solo en sus tareas.",
    inputSchema: {
      proyectoId,
      tipo,
      duenoId,
      snapshot: z.string().max(MAX_BOARD_SNAPSHOT_BYTES).describe("Snapshot JSON de Excalidraw con elements[]"),
      revision: z.number().int().nonnegative().describe("Revisión leída antes de guardar"),
    },
    outputSchema: {
      revision: z.number().int().positive(),
      updatedAt: z.number().int().nonnegative(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: guardarPizarra,
  },
];
