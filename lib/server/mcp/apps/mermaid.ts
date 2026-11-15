import { z } from "zod";
import { validarDocumentoMermaid } from "../../../domain/mermaid/document";
import { MERMAID_TEMPLATES } from "../../../domain/mermaid/templates";
import { MAX_APP_DOCUMENT_CHARS, readAppDocument, saveAppDocument } from "../../app-documents";
import { errorHerramienta, payloadResult, type McpCaller } from "../contexto";
import { resolverAppEnProyecto, resolverAppInstalada } from "./contrato";
import type { McpToolDefinicion } from "../dominios/tipos";

/**
 * Herramientas MCP de Diagramas (MCP-05E).
 *
 * La app y MCP leen y escriben la misma fila de `app_documents` con
 * `appId: "mermaid"`. MCP no valida la sintaxis ni renderiza SVG: solo
 * comprueba que el documento tenga `code` textual, guarda el objeto completo
 * y devuelve la misma lista de plantillas que la ventana.
 */

const proyectoId = z.string().uuid().describe("Id del proyecto de Aula Kanban");

/**
 * Lee el diagrama guardado en el proyecto.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto del diagrama.
 * @returns El código y su fecha, o ambos `null` si aún no hay diagrama.
 */
async function leerDiagrama(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { proyectoId: string };
  const resolved = await resolverAppEnProyecto(caller, { proyectoId: a.proyectoId, appId: "mermaid" });
  if (!resolved.ok) return resolved.resultado;

  const document = await readAppDocument(resolved.project.id, "mermaid");
  const documento = validarDocumentoMermaid(document?.state);
  return payloadResult({
    codigo: documento?.code ?? null,
    actualizado: document?.updatedAt ?? null,
  });
}

/**
 * Guarda el documento del diagrama sin revisión optimista.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto y documento con `code` textual.
 * @returns La fecha de actualización aplicada.
 */
async function guardarDiagrama(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { proyectoId: string; documento: unknown };
  const documento = validarDocumentoMermaid(a.documento);
  if (!documento) {
    return errorHerramienta("invalid", "El documento no es un diagrama válido: falta el código en code.");
  }

  const serialized = JSON.stringify(documento);
  if (serialized.length > MAX_APP_DOCUMENT_CHARS) {
    return errorHerramienta("too_large", "El diagrama supera el límite de 200.000 caracteres.");
  }

  const resolved = await resolverAppEnProyecto(caller, { proyectoId: a.proyectoId, appId: "mermaid", escritura: true });
  if (!resolved.ok) return resolved.resultado;

  const actualizado = await saveAppDocument({
    projectId: resolved.project.id,
    appId: "mermaid",
    state: serialized,
    updatedByUserId: resolved.access.user.userId,
  });
  return payloadResult({ actualizado });
}

/**
 * Lista las plantillas que ofrece la app, sin exigir proyecto.
 * @param _caller - Cuenta autenticada (la herramienta no usa proyecto).
 * @param _args - Sin argumentos.
 * @returns Las plantillas con identificador, nombre y código.
 */
async function listarPlantillasDiagrama(_caller: McpCaller, _args: Record<string, unknown>) {
  const app = await resolverAppInstalada("mermaid");
  if (!app.ok) return app.resultado;

  return payloadResult({
    plantillas: MERMAID_TEMPLATES.map((template) => ({
      id: template.id,
      nombre: template.label,
      codigo: template.code,
    })),
  });
}

/** Herramientas del dominio de apps: Diagramas. */
export const herramientasMermaid: McpToolDefinicion[] = [
  {
    name: "leer_diagrama",
    title: "Leer diagrama",
    description: "Lee el código Mermaid guardado en el proyecto y su fecha de actualización; codigo y actualizado son null si aún no hay diagrama. Requiere que Diagramas esté instalada y acceso al proyecto.",
    inputSchema: { proyectoId },
    outputSchema: {
      codigo: z.string().nullable(),
      actualizado: z.number().int().nonnegative().nullable(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: leerDiagrama,
  },
  {
    name: "guardar_diagrama",
    title: "Guardar diagrama",
    description: "Guarda el documento del diagrama con code textual, conserva las claves internas y rechaza documentos de más de 200.000 caracteres. No valida la sintaxis ni renderiza el SVG. Requiere permiso de escritura; los invitados no escriben y la última escritura gana.",
    inputSchema: {
      proyectoId,
      documento: z.record(z.unknown()).describe("Documento de Diagramas con code: string"),
    },
    outputSchema: {
      actualizado: z.number().int().nonnegative(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: guardarDiagrama,
  },
  {
    name: "listar_plantillas_diagrama",
    title: "Listar plantillas de diagrama",
    description: "Devuelve las plantillas de Diagramas con su identificador, nombre y código, las mismas que ofrece la app. Requiere que Diagramas esté instalada; no necesita proyecto.",
    inputSchema: {},
    outputSchema: {
      plantillas: z.array(z.object({ id: z.string(), nombre: z.string(), codigo: z.string() })),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarPlantillasDiagrama,
  },
];
