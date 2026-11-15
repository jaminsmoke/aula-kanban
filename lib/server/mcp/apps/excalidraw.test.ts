import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolverAppEnProyecto: vi.fn(),
  readBoard: vi.fn(),
  saveBoard: vi.fn(),
}));

vi.mock("./contrato", () => ({ resolverAppEnProyecto: mocks.resolverAppEnProyecto }));
vi.mock("../../boards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../boards")>();
  return { ...actual, readBoard: mocks.readBoard, saveBoard: mocks.saveBoard };
});

import { MAX_BOARD_SNAPSHOT_BYTES } from "../../boards";
import { herramientasExcalidraw } from "./excalidraw";

const caller = { userId: "u1", email: "docente@example.com" };
const tools = Object.fromEntries(herramientasExcalidraw.map((tool) => [tool.name, tool]));
const projectId = "11111111-1111-4111-8111-111111111111";
const access = {
  user: { userId: "u1", email: "docente@example.com", displayName: "Docente", fullName: null },
  role: "teacher",
  studentSection: null,
  teacherId: null,
};

type Body = {
  snapshot?: string;
  revision?: number;
  updatedAt?: number;
  error?: { codigo: string; estado: number; mensaje: string; revisionActual?: number };
};

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
  mocks.resolverAppEnProyecto.mockResolvedValue({
    ok: true,
    app: { id: "excalidraw", name: "Excalidraw" },
    project: { id: projectId, name: "Proyecto" },
    access,
  });
  mocks.readBoard.mockResolvedValue({
    ok: true,
    value: { ownerType: "space", ownerId: projectId, snapshot: '{"elements":[]}', revision: 2, updatedAt: 10 },
  });
  mocks.saveBoard.mockResolvedValue({
    ok: true,
    value: { ownerType: "space", ownerId: projectId, snapshot: '{"elements":[]}', revision: 3, updatedAt: 20 },
  });
});

describe("herramientas de Excalidraw", () => {
  it("lee una pizarra con el proyecto resuelto", async () => {
    const body = await call("leer_pizarra", { proyectoId: projectId, tipo: "space", duenoId: projectId });
    expect(body).toMatchObject({ snapshot: '{"elements":[]}', revision: 2, updatedAt: 10 });
    expect(mocks.resolverAppEnProyecto).toHaveBeenCalledWith(caller, { proyectoId: projectId, appId: "excalidraw" });
    expect(mocks.readBoard).toHaveBeenCalledWith(projectId, "space", projectId);
  });

  it("guarda una pizarra con revisión y permiso de escritura", async () => {
    const body = await call("guardar_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      snapshot: '{"elements":[]}',
      revision: 2,
    });
    expect(body).toMatchObject({ revision: 3, updatedAt: 20 });
    expect(mocks.resolverAppEnProyecto).toHaveBeenCalledWith(caller, { proyectoId: projectId, appId: "excalidraw", escritura: true });
    expect(mocks.saveBoard).toHaveBeenCalledWith({
      projectId,
      access,
      ownerType: "space",
      ownerId: projectId,
      snapshot: '{"elements":[]}',
      revision: 2,
    });
  });

  it("rechaza un snapshot que no es JSON con elements[]", async () => {
    expect((await call("guardar_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      snapshot: '{"otra":true}',
      revision: 2,
    })).error).toMatchObject({ codigo: "invalid", estado: 400 });
    expect(mocks.saveBoard).not.toHaveBeenCalled();
  });

  it("rechaza un snapshot por encima del límite", async () => {
    expect((await call("guardar_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      snapshot: "x".repeat(MAX_BOARD_SNAPSHOT_BYTES + 1),
      revision: 2,
    })).error).toMatchObject({ codigo: "invalid", estado: 400 });
    expect(mocks.saveBoard).not.toHaveBeenCalled();
  });

  it("devuelve conflict con la revisión actual", async () => {
    mocks.saveBoard.mockResolvedValue({
      ok: false,
      status: 409,
      message: "La pizarra cambió en otra sesión. Actualiza antes de guardar.",
      revisionActual: 4,
    });
    const body = await call("guardar_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      snapshot: '{"elements":[]}',
      revision: 2,
    });
    expect(body.error).toMatchObject({
      codigo: "conflict",
      estado: 409,
      revisionActual: 4,
    });
  });

  it("propaga el error de app desinstalada o sin acceso", async () => {
    mocks.resolverAppEnProyecto.mockResolvedValue({
      ok: false,
      resultado: {
        content: [{ type: "text", text: "La aplicación no está instalada" }],
        structuredContent: { error: { codigo: "not_found", estado: 404, mensaje: "La aplicación no está instalada" } },
        isError: true,
      },
    });
    expect((await call("leer_pizarra", { proyectoId: projectId, tipo: "space", duenoId: projectId })).error)
      .toMatchObject({ codigo: "not_found", estado: 404 });
  });

  it("propaga el forbidden del servicio para el alumnado fuera de su tarea", async () => {
    mocks.saveBoard.mockResolvedValue({
      ok: false,
      status: 403,
      message: "No puedes editar la pizarra de este elemento.",
    });
    expect((await call("guardar_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      snapshot: '{"elements":[]}',
      revision: 2,
    })).error).toMatchObject({ codigo: "forbidden", estado: 403 });
  });
});
