import { z } from "zod";
import {
  readAulaMermaidCode,
  writeAulaMermaidCode,
} from "../../../domain/aula-documentos/mermaid-compat";
import { validarDocumentoMermaid } from "../../../domain/mermaid/document";
import { MERMAID_TEMPLATES } from "../../../domain/mermaid/templates";
import { MAX_APP_DOCUMENT_CHARS, readAppDocument, saveAppDocument } from "../../apps/app-documents";
import {
  LEGACY_AULA_DOCUMENT_ID,
  listAulaDocumentSuite,
  readAulaDocument,
  saveAulaDocumentIfCurrent,
} from "../../aula-documentos/documents";
import { errorHerramienta, payloadResult, type McpCaller } from "../contexto";
import { resolverAppEnProyecto, resolverAppInstalada } from "./contrato";
import type { McpToolDefinicion } from "../dominios/tipos";

/**
 * Herramientas MCP de Diagramas (MCP-05E).
 *
 * Aula Documentos es la app canónica: si tiene documento, MCP usa su primer
 * bloque Mermaid. Si no, lee o escribe directamente la fila histórica
 * `appId: "mermaid"` para no romper proyectos que aún no se han migrado.
 * MCP no valida la sintaxis ni renderiza SVG: solo comprueba el código textual
 * y comparte las plantillas.
 */

const proyectoId = z.string().uuid().describe("Id del proyecto de Aula Kanban");

type DocumentoMermaidResuelto =
  | {
    ok: true;
    kind: "aula-documentos" | "mermaid";
    project: { id: string };
    userId: string;
    documentId: string;
    document: { state: unknown; updatedAt: number } | null;
    code: string | null;
  }
  | { ok: false; resultado: ReturnType<typeof errorHerramienta> };

/**
 * Resuelve el documento que contiene el diagrama del proyecto.
 *
 * Aula Documentos es la app canónica: si tiene un documento válido, sus
 * herramientas leen y escriben su primer bloque Mermaid. Si Aula aún no tiene
 * documento, se conserva la compatibilidad con la fila antigua de Diagramas.
 * @param caller - Cuenta identificada por el token.
 * @param proyecto - Proyecto y permiso de escritura de la llamada.
 * @returns El documento resuelto o el error del contrato MCP.
 */
async function resolverDocumentoMermaid(
  caller: McpCaller,
  proyecto: { proyectoId: string; escritura?: boolean; documentoId?: string },
): Promise<DocumentoMermaidResuelto> {
  const aula = await resolverAppEnProyecto(caller, {
    proyectoId: proyecto.proyectoId,
    appId: "aula-documentos",
    ...(proyecto.escritura ? { escritura: true } : {}),
  });
  if (!aula.ok) return { ok: false, resultado: aula.resultado };

  if (proyecto.documentoId) {
    const document = await readAulaDocument(aula.project.id, proyecto.documentoId);
    if (!document) {
      return { ok: false, resultado: errorHerramienta("not_found", "Documento de Aula Documentos no encontrado.") };
    }
    const read = readAulaMermaidCode(document.state);
    return {
      ok: true,
      kind: "aula-documentos",
      project: aula.project,
      userId: aula.access.user.userId,
      documentId: document.id,
      document: { state: document.state, updatedAt: document.updatedAt },
      code: read.ok ? read.code : null,
    };
  }

  const suite = await listAulaDocumentSuite(aula.project.id);
  const selectedId = suite.active.find((document) => document.id === LEGACY_AULA_DOCUMENT_ID)?.id
    ?? suite.active[0]?.id;
  if (selectedId) {
    const document = await readAulaDocument(aula.project.id, selectedId);
    if (document) {
      const read = readAulaMermaidCode(document.state);
      if (read.ok) {
        return {
          ok: true,
          kind: "aula-documentos",
          project: aula.project,
          userId: aula.access.user.userId,
          documentId: document.id,
          document: { state: document.state, updatedAt: document.updatedAt },
          code: read.code,
        };
      }
    }
  }

  const legacyDocument = await readAppDocument(aula.project.id, "mermaid");
  return {
    ok: true,
    kind: "mermaid",
    project: aula.project,
    userId: aula.access.user.userId,
    documentId: "mermaid",
    document: legacyDocument,
    code: legacyDocument ? validarDocumentoMermaid(legacyDocument.state)?.code ?? null : null,
  };
}

/**
 * Lee el diagrama guardado en el proyecto.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto del diagrama.
 * @returns El código y su fecha, o ambos `null` si aún no hay diagrama.
 */
async function leerDiagrama(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { proyectoId: string; documentoId?: string };
  const resolved = await resolverDocumentoMermaid(caller, { proyectoId: a.proyectoId, documentoId: a.documentoId });
  if (!resolved.ok) return resolved.resultado;

  return payloadResult({
    codigo: resolved.code,
    actualizado: resolved.document?.updatedAt ?? null,
    documentoId: resolved.documentId,
  });
}

/**
 * Guarda el documento del diagrama sin revisión optimista.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto y documento con `code` textual.
 * @returns La fecha de actualización aplicada.
 */
async function guardarDiagrama(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { proyectoId: string; documento: unknown; documentoId?: string };
  const documento = validarDocumentoMermaid(a.documento);
  if (!documento) {
    return errorHerramienta("invalid", "El documento no es un diagrama válido: falta el código en code.");
  }

  if (JSON.stringify(documento).length > MAX_APP_DOCUMENT_CHARS) {
    return errorHerramienta("too_large", "El diagrama supera el límite de 200.000 caracteres.");
  }

  const resolved = await resolverDocumentoMermaid(caller, {
    proyectoId: a.proyectoId,
    escritura: true,
    documentoId: a.documentoId,
  });
  if (!resolved.ok) return resolved.resultado;

  if (resolved.kind === "aula-documentos" && resolved.document) {
    const written = writeAulaMermaidCode(resolved.document.state, documento.code);
    if (!written.ok) {
      return errorHerramienta("invalid", `El documento de Aula Documentos no se puede actualizar: ${written.message}`);
    }
    const serialized = JSON.stringify(written.document);
    if (serialized.length > MAX_APP_DOCUMENT_CHARS) {
      return errorHerramienta("too_large", "El diagrama supera el límite de 200.000 caracteres.");
    }
    const saved = await saveAulaDocumentIfCurrent({
      projectId: resolved.project.id,
      id: resolved.documentId,
      state: written.document,
      updatedByUserId: resolved.userId,
      expectedUpdatedAt: resolved.document.updatedAt,
    });
    if (saved.status === "conflict") return errorHerramienta("conflict", "El documento cambió en otra sesión.");
    if (saved.status === "too-large") return errorHerramienta("too_large", "El diagrama supera el límite de 200.000 caracteres.");
    if (saved.status === "invalid") return errorHerramienta("invalid", "El documento no se pudo serializar.");
    return payloadResult({ actualizado: saved.updatedAt, documentoId: resolved.documentId });
  }

  const state = JSON.stringify(documento);
  if (state.length > MAX_APP_DOCUMENT_CHARS) {
    return errorHerramienta("too_large", "El diagrama supera el límite de 200.000 caracteres.");
  }

  const actualizado = await saveAppDocument({
    projectId: resolved.project.id,
    appId: "mermaid",
    state,
    updatedByUserId: resolved.userId,
  });
  return payloadResult({ actualizado, documentoId: resolved.documentId });
}

/**
 * Lista las plantillas que ofrece la app, sin exigir proyecto.
 * @param _caller - Cuenta autenticada (la herramienta no usa proyecto).
 * @param _args - Sin argumentos.
 * @returns Las plantillas con identificador, nombre y código.
 */
async function listarPlantillasDiagrama(_caller: McpCaller, _args: Record<string, unknown>) {
  const app = await resolverAppInstalada("aula-documentos");
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
    description: "Lee el código Mermaid guardado en el proyecto y su fecha de actualización; codigo y actualizado son null si aún no hay diagrama. Con documentoId usa ese documento; sin id usa legacy o el primer documento activo de Aula Documentos y, si no hay bloque, la fila histórica de Diagramas. Requiere que Aula Documentos esté instalada y acceso al proyecto.",
    inputSchema: {
      proyectoId,
      documentoId: z.string().min(1).optional().describe("Documento de Aula Documentos; sin id se resuelve legacy o el primero activo"),
    },
    outputSchema: {
      codigo: z.string().nullable(),
      actualizado: z.number().int().nonnegative().nullable(),
      documentoId: z.string(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: leerDiagrama,
  },
  {
    name: "guardar_diagrama",
    title: "Guardar diagrama",
    description: "Guarda el documento del diagrama con code textual. Con documentoId actualiza el primer bloque Mermaid de ese documento; sin id usa legacy o el primer documento activo y, si no hay bloque, conserva la fila antigua. Rechaza documentos de más de 200.000 caracteres, no valida la sintaxis ni renderiza el SVG y falla con conflicto si el documento cambió. Requiere permiso de escritura; los invitados no escriben.",
    inputSchema: {
      proyectoId,
      documentoId: z.string().min(1).optional().describe("Documento de Aula Documentos; sin id se resuelve legacy o el primero activo"),
      documento: z.record(z.unknown()).describe("Documento de Diagramas con code: string"),
    },
    outputSchema: {
      actualizado: z.number().int().nonnegative(),
      documentoId: z.string(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: guardarDiagrama,
  },
  {
    name: "listar_plantillas_diagrama",
    title: "Listar plantillas de diagrama",
    description: "Devuelve las plantillas de Diagramas con su identificador, nombre y código, las mismas que ofrece Aula Documentos. Requiere que Aula Documentos esté instalada; no necesita proyecto.",
    inputSchema: {},
    outputSchema: {
      plantillas: z.array(z.object({ id: z.string(), nombre: z.string(), codigo: z.string() })),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarPlantillasDiagrama,
  },
];
