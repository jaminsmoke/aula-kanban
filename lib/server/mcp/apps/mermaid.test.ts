import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolverAppEnProyecto: vi.fn(),
  resolverAppInstalada: vi.fn(),
  readAppDocument: vi.fn(),
  saveAppDocument: vi.fn(),
  listAulaSuite: vi.fn(),
  readAulaDocument: vi.fn(),
  saveAulaDocument: vi.fn(),
}));

vi.mock("./contrato", () => ({
  resolverAppEnProyecto: mocks.resolverAppEnProyecto,
  resolverAppInstalada: mocks.resolverAppInstalada,
}));
vi.mock("../../apps/app-documents", () => ({
  MAX_APP_DOCUMENT_CHARS: 200_000,
  readAppDocument: mocks.readAppDocument,
  saveAppDocument: mocks.saveAppDocument,
}));
vi.mock("../../aula-documentos/documents", () => ({
  LEGACY_AULA_DOCUMENT_ID: "legacy",
  listAulaDocumentSuite: mocks.listAulaSuite,
  readAulaDocument: mocks.readAulaDocument,
  saveAulaDocumentIfCurrent: mocks.saveAulaDocument,
}));

import { MERMAID_TEMPLATES } from "../../../domain/mermaid/templates";
import { herramientasMermaid } from "./mermaid";

const caller = { userId: "u1", email: "docente@example.com" };
const tools = Object.fromEntries(herramientasMermaid.map((tool) => [tool.name, tool]));
const projectId = "11111111-1111-4111-8111-111111111111";
const access = {
  user: { userId: "u1", email: "docente@example.com", displayName: "Docente", fullName: null },
  role: "teacher",
  studentSection: null,
  teacherId: null,
};

type Body = {
  codigo?: string | null;
  actualizado?: number | null;
  documentoId?: string;
  plantillas?: Array<{ id: string; nombre: string; codigo: string }>;
  error?: { codigo: string; estado: number; mensaje: string };
};

type Documento = { state: unknown; updatedAt: number };
let documentos: Map<string, Documento>;
let aulaDocumentos: Map<string, { id: string; state: unknown; updatedAt: number }>;

/**
 * Ejecuta una herramienta y devuelve su contenido estructurado.
 * @param name - Nombre de la herramienta.
 * @param args - Argumentos de la llamada.
 * @returns El payload o el error estructurado.
 */
async function call(name: string, args: Record<string, unknown>) {
  const result = await tools[name].handler(caller, args);
  return result.structuredContent as Body;
}

beforeEach(() => {
  vi.clearAllMocks();
  documentos = new Map();
  aulaDocumentos = new Map();
  mocks.resolverAppEnProyecto.mockResolvedValue({
    ok: true,
    app: { id: "mermaid", name: "Diagramas" },
    project: { id: projectId, name: "Proyecto" },
    access,
  });
  mocks.resolverAppInstalada.mockResolvedValue({ ok: true, app: { id: "mermaid", name: "Diagramas" } });
  mocks.readAppDocument.mockImplementation(async (id: string, appId: string) => documentos.get(`${id}:${appId}`) ?? null);
  mocks.saveAppDocument.mockImplementation(async (input: { projectId: string; appId: string; state: string; updatedByUserId: string | null }) => {
    const updatedAt = 1_000 + documentos.size;
    documentos.set(`${input.projectId}:${input.appId}`, { state: JSON.parse(input.state), updatedAt });
    return updatedAt;
  });
  mocks.listAulaSuite.mockImplementation(async (id: string) => ({
    active: [...aulaDocumentos.entries()]
      .filter(([key]) => key.startsWith(`${id}:`))
      .map(([, value]) => ({ id: value.id, projectId: id, title: "Documento", excerpt: "", status: "active", createdAt: 1, updatedAt: value.updatedAt, archivedAt: null, createdBy: null, updatedBy: null })),
    archived: [],
    deleted: [],
  }));
  mocks.readAulaDocument.mockImplementation(async (id: string, documentId: string) => {
    const value = aulaDocumentos.get(`${id}:${documentId}`);
    return value ? { ...value, projectId: id, title: "Documento", excerpt: "", status: "active", createdAt: 1, archivedAt: null, createdBy: null, updatedBy: null } : null;
  });
  mocks.saveAulaDocument.mockImplementation(async (input: { projectId: string; id: string; state: unknown; expectedUpdatedAt: number | null }) => {
    const current = aulaDocumentos.get(`${input.projectId}:${input.id}`);
    if (input.expectedUpdatedAt !== current?.updatedAt) return { status: "conflict", updatedAt: current?.updatedAt ?? null };
    const updatedAt = (current?.updatedAt ?? 0) + 1;
    aulaDocumentos.set(`${input.projectId}:${input.id}`, { id: input.id, state: input.state, updatedAt });
    return { status: "saved", updatedAt };
  });
});

describe("herramientas de Diagramas", () => {
  it("lee el diagrama guardado por la web y conserva las claves desconocidas al guardar", async () => {
    documentos.set(`${projectId}:mermaid`, { state: { code: "flowchart TD\n  A --> B", tema: "oscuro" }, updatedAt: 10 });

    const body = await call("leer_diagrama", { proyectoId: projectId });
    expect(body).toEqual({ codigo: "flowchart TD\n  A --> B", actualizado: 10, documentoId: "mermaid" });
    expect(mocks.resolverAppEnProyecto).toHaveBeenCalledWith(caller, { proyectoId: projectId, appId: "aula-documentos" });
    expect(mocks.readAppDocument).toHaveBeenCalledWith(projectId, "mermaid");

    const guardado = await call("guardar_diagrama", {
      proyectoId: projectId,
      documento: { code: "sequenceDiagram\n  A->>B: Hola", tema: "claro" },
    });
    expect(guardado.actualizado).toEqual(expect.any(Number));
    expect(mocks.resolverAppEnProyecto).toHaveBeenCalledWith(caller, { proyectoId: projectId, appId: "aula-documentos", escritura: true });
    expect(documentos.get(`${projectId}:mermaid`)?.state).toEqual({ code: "sequenceDiagram\n  A->>B: Hola", tema: "claro" });
    expect(await call("leer_diagrama", { proyectoId: projectId })).toMatchObject({ actualizado: guardado.actualizado });
  });

  it("usa el diagrama de Aula Documentos cuando existe y deja intacta la fila antigua", async () => {
    documentos.set(`${projectId}:mermaid`, { state: { code: "flowchart TD\n  Antiguo --> B" }, updatedAt: 10 });
    aulaDocumentos.set(`${projectId}:legacy`, {
      id: "legacy",
      state: {
        schemaVersion: 3,
        title: "Documento unificado",
        content: {
          type: "doc",
          content: [{ type: "mermaidBlock", attrs: { code: "flowchart LR\n  Aula --> B" } }],
        },
      },
      updatedAt: 20,
    });

    const body = await call("leer_diagrama", { proyectoId: projectId });
    expect(body).toEqual({ codigo: "flowchart LR\n  Aula --> B", actualizado: 20, documentoId: "legacy" });
    expect(mocks.resolverAppEnProyecto).toHaveBeenCalledWith(
      caller,
      { proyectoId: projectId, appId: "aula-documentos" },
    );

    const guardado = await call("guardar_diagrama", {
      proyectoId: projectId,
      documentoId: "legacy",
      documento: { code: "sequenceDiagram\n  Aula->>B: Nuevo" },
    });
    expect(guardado.actualizado).toEqual(expect.any(Number));
    expect(guardado.documentoId).toBe("legacy");
    expect(documentos.get(`${projectId}:mermaid`)?.state).toEqual({ code: "flowchart TD\n  Antiguo --> B" });
    expect(JSON.stringify(aulaDocumentos.get(`${projectId}:legacy`)?.state)).toContain("Aula->>B: Nuevo");
  });

  it("acepta un documento explícito y rechaza uno ajeno", async () => {
    aulaDocumentos.set(`${projectId}:doc1`, {
      id: "doc1",
      state: {
        schemaVersion: 3,
        title: "Documento 1",
        content: { type: "doc", content: [{ type: "mermaidBlock", attrs: { code: "flowchart TD\n  Uno --> Dos" } }] },
      },
      updatedAt: 30,
    });

    expect(await call("leer_diagrama", { proyectoId: projectId, documentoId: "doc1" })).toEqual({
      codigo: "flowchart TD\n  Uno --> Dos",
      actualizado: 30,
      documentoId: "doc1",
    });
    expect((await call("leer_diagrama", { proyectoId: projectId, documentoId: "doc2" })).error)
      .toMatchObject({ codigo: "not_found", estado: 404 });
  });

  it("devuelve conflicto si el documento cambió durante el guardado", async () => {
    aulaDocumentos.set(`${projectId}:doc1`, {
      id: "doc1",
      state: {
        schemaVersion: 3,
        title: "Documento 1",
        content: { type: "doc", content: [{ type: "mermaidBlock", attrs: { code: "flowchart TD\n  Uno --> Dos" } }] },
      },
      updatedAt: 30,
    });
    mocks.saveAulaDocument.mockResolvedValueOnce({ status: "conflict", updatedAt: 31 });

    expect((await call("guardar_diagrama", {
      proyectoId: projectId,
      documentoId: "doc1",
      documento: { code: "flowchart LR\n  Otro --> Diagrama" },
    })).error).toMatchObject({ codigo: "conflict", estado: 409 });
  });

  it("devuelve null si el proyecto aún no tiene diagrama", async () => {
    const body = await call("leer_diagrama", { proyectoId: projectId });
    expect(body).toEqual({ codigo: null, actualizado: null, documentoId: "mermaid" });
  });

  it("no devuelve un código cuando la fila guardada no tiene code textual", async () => {
    documentos.set(`${projectId}:mermaid`, { state: { blocks: { blocks: [] } }, updatedAt: 7 });
    const body = await call("leer_diagrama", { proyectoId: projectId });
    expect(body).toEqual({ codigo: null, actualizado: 7, documentoId: "mermaid" });
  });

  it("rechaza documentos sin code textual antes de resolver el proyecto", async () => {
    for (const documento of [{}, { code: 1 }, { code: null }, { codigo: "flowchart TD" }, null, [], "texto"]) {
      const body = await call("guardar_diagrama", { proyectoId: projectId, documento });
      expect(body.error).toMatchObject({ codigo: "invalid", estado: 400 });
    }
    expect(mocks.resolverAppEnProyecto).not.toHaveBeenCalled();
    expect(mocks.saveAppDocument).not.toHaveBeenCalled();
  });

  it("rechaza un diagrama por encima del límite sin tocar la base de datos", async () => {
    const documento = { code: "x".repeat(200_000) };
    const body = await call("guardar_diagrama", { proyectoId: projectId, documento });
    expect(body.error).toMatchObject({ codigo: "too_large", estado: 413 });
    expect(mocks.resolverAppEnProyecto).not.toHaveBeenCalled();
    expect(mocks.saveAppDocument).not.toHaveBeenCalled();
  });

  it("bloquea la escritura de las cuentas invitadas", async () => {
    mocks.resolverAppEnProyecto.mockResolvedValue({
      ok: false,
      resultado: {
        content: [{ type: "text", text: "Las cuentas invitadas solo pueden consultar el proyecto." }],
        structuredContent: { error: { codigo: "forbidden", estado: 403, mensaje: "Las cuentas invitadas solo pueden consultar el proyecto." } },
        isError: true,
      },
    });
    const body = await call("guardar_diagrama", { proyectoId: projectId, documento: { code: "flowchart TD" } });
    expect(body.error).toMatchObject({ codigo: "forbidden", estado: 403 });
    expect(mocks.saveAppDocument).not.toHaveBeenCalled();
  });

  it("propaga app desinstalada o proyecto inexistente en lectura y escritura", async () => {
    mocks.resolverAppEnProyecto.mockResolvedValue({
      ok: false,
      resultado: {
        content: [{ type: "text", text: "La aplicación no está instalada" }],
        structuredContent: { error: { codigo: "not_found", estado: 404, mensaje: "La aplicación no está instalada" } },
        isError: true,
      },
    });
    expect((await call("leer_diagrama", { proyectoId: projectId })).error).toMatchObject({ codigo: "not_found", estado: 404 });
    expect((await call("guardar_diagrama", { proyectoId: projectId, documento: { code: "flowchart TD" } })).error)
      .toMatchObject({ codigo: "not_found", estado: 404 });
    expect(mocks.saveAppDocument).not.toHaveBeenCalled();
  });

  it("lista las plantillas de la app sin exigir proyecto", async () => {
    const body = await call("listar_plantillas_diagrama", {});
    expect(body.plantillas).toEqual(MERMAID_TEMPLATES.map((template) => ({
      id: template.id,
      nombre: template.label,
      codigo: template.code,
    })));
    expect(mocks.resolverAppInstalada).toHaveBeenCalledWith("aula-documentos");
    expect(mocks.resolverAppEnProyecto).not.toHaveBeenCalled();
  });

  it("propaga la app desinstalada al listar plantillas", async () => {
    mocks.resolverAppInstalada.mockResolvedValue({
      ok: false,
      resultado: {
        content: [{ type: "text", text: "La aplicación no está instalada" }],
        structuredContent: { error: { codigo: "not_found", estado: 404, mensaje: "La aplicación no está instalada" } },
        isError: true,
      },
    });
    const body = await call("listar_plantillas_diagrama", {});
    expect(body.error).toMatchObject({ codigo: "not_found", estado: 404 });
  });
});
