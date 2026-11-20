import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolverAppEnProyecto: vi.fn(),
  readAppDocument: vi.fn(),
  saveAppDocument: vi.fn(),
}));

vi.mock("./contrato", () => ({ resolverAppEnProyecto: mocks.resolverAppEnProyecto }));
vi.mock("../../apps/app-documents", () => ({
  MAX_APP_DOCUMENT_CHARS: 200_000,
  readAppDocument: mocks.readAppDocument,
  saveAppDocument: mocks.saveAppDocument,
}));

import { herramientasBlockly } from "./blockly";

const caller = { userId: "u1", email: "docente@example.com" };
const tools = Object.fromEntries(herramientasBlockly.map((tool) => [tool.name, tool]));
const projectId = "11111111-1111-4111-8111-111111111111";
const access = {
  user: { userId: "u1", email: "docente@example.com", displayName: "Docente", fullName: null },
  role: "teacher",
  studentSection: null,
  teacherId: null,
};

type Body = {
  estado?: Record<string, unknown> | null;
  actualizado?: number | null;
  error?: { codigo: string; estado: number; mensaje: string };
};

type Documento = { state: unknown; updatedAt: number };
let documentos: Map<string, Documento>;

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
  mocks.resolverAppEnProyecto.mockResolvedValue({
    ok: true,
    app: { id: "blockly", name: "Blockly" },
    project: { id: projectId, name: "Proyecto" },
    access,
  });
  mocks.readAppDocument.mockImplementation(async (id: string, appId: string) => documentos.get(`${id}:${appId}`) ?? null);
  mocks.saveAppDocument.mockImplementation(async (input: { projectId: string; appId: string; state: string; updatedByUserId: string | null }) => {
    const updatedAt = 1_000 + documentos.size;
    documentos.set(`${input.projectId}:${input.appId}`, { state: JSON.parse(input.state), updatedAt });
    return updatedAt;
  });
});

describe("herramientas de Blockly", () => {
  it("lee el programa guardado por la web y conserva los campos desconocidos", async () => {
    const estado = {
      blocks: { languageVersion: 0, blocks: [{ type: "text_print", x: 10, y: 20 }] },
      extra: { tema: "zelos" },
    };
    documentos.set(`${projectId}:blockly`, { state: estado, updatedAt: 10 });

    const body = await call("leer_programa_bloques", { proyectoId: projectId });
    expect(body).toMatchObject({ actualizado: 10 });
    expect(body.estado).toEqual(estado);
    expect(mocks.resolverAppEnProyecto).toHaveBeenCalledWith(caller, { proyectoId: projectId, appId: "blockly" });
    expect(mocks.readAppDocument).toHaveBeenCalledWith(projectId, "blockly");
  });

  it("devuelve null si el proyecto aún no tiene programa", async () => {
    const body = await call("leer_programa_bloques", { proyectoId: projectId });
    expect(body).toEqual({ estado: null, actualizado: null });
  });

  it("guarda el objeto completo y se vuelve a leer por MCP y por la web", async () => {
    const estado = {
      blocks: { languageVersion: 0, blocks: [{ type: "controls_repeat_ext", x: 0, y: 0 }] },
      extra: { tema: "zelos" },
    };
    const body = await call("guardar_programa_bloques", { proyectoId: projectId, estado });
    expect(body.actualizado).toEqual(expect.any(Number));
    expect(mocks.resolverAppEnProyecto).toHaveBeenCalledWith(caller, { proyectoId: projectId, appId: "blockly", escritura: true });

    const guardado = mocks.saveAppDocument.mock.calls[0][0] as { projectId: string; appId: string; state: string; updatedByUserId: string | null };
    expect(guardado).toMatchObject({ projectId, appId: "blockly", updatedByUserId: "u1" });
    expect(JSON.parse(guardado.state)).toEqual(estado);
    // La web lee la misma fila con `readAppDocument`; aquí es el doble en memoria.
    expect(await call("leer_programa_bloques", { proyectoId: projectId })).toMatchObject({ actualizado: body.actualizado });
    expect(documentos.get(`${projectId}:blockly`)?.state).toEqual(estado);
  });

  it("rechaza estados sin blocks.blocks[] antes de resolver el proyecto", async () => {
    for (const estado of [{}, { blocks: {} }, { blocks: [] }, { blocks: { blocks: {} } }, null, [], "texto"]) {
      const body = await call("guardar_programa_bloques", { proyectoId: projectId, estado });
      expect(body.error).toMatchObject({ codigo: "invalid", estado: 400 });
    }
    expect(mocks.resolverAppEnProyecto).not.toHaveBeenCalled();
    expect(mocks.saveAppDocument).not.toHaveBeenCalled();
  });

  it("rechaza un estado por encima del límite sin tocar la base de datos", async () => {
    const estado = { blocks: { blocks: [], relleno: "x".repeat(200_000) } };
    const body = await call("guardar_programa_bloques", { proyectoId: projectId, estado });
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
    const body = await call("guardar_programa_bloques", { proyectoId: projectId, estado: { blocks: { blocks: [] } } });
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
    expect((await call("leer_programa_bloques", { proyectoId: projectId })).error).toMatchObject({ codigo: "not_found", estado: 404 });
    expect((await call("guardar_programa_bloques", {
      proyectoId: projectId,
      estado: { blocks: { blocks: [] } },
    })).error).toMatchObject({ codigo: "not_found", estado: 404 });
    expect(mocks.saveAppDocument).not.toHaveBeenCalled();
  });
});
