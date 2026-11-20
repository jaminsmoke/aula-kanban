import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolverAppEnProyecto: vi.fn(),
  readBoard: vi.fn(),
  saveBoard: vi.fn(),
  publicarEscena: vi.fn(),
}));

vi.mock("./contrato", () => ({ resolverAppEnProyecto: mocks.resolverAppEnProyecto }));
vi.mock("../../board/boards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../board/boards")>();
  return { ...actual, readBoard: mocks.readBoard, saveBoard: mocks.saveBoard };
});
vi.mock("../../board/board-control", () => ({ publicarEscena: mocks.publicarEscena }));

import { MAX_BOARD_SNAPSHOT_BYTES } from "../../board/boards";
import { MAX_ELEMENTOS_ANADIDOS } from "../../../domain/boards/excalidraw-elements";
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
  anadidos?: number;
  sincronizada?: boolean;
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
  mocks.publicarEscena.mockResolvedValue(true);
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

  it("añade elementos y publica la escena guardada", async () => {
    const escena = {
      type: "excalidraw",
      version: 2,
      source: "aula-kanban",
      custom: "se conserva",
      elements: [{ id: "anterior", version: 2 }],
      appState: { zoom: { value: 1 } },
      files: { f1: { dataURL: "/api/files/f1" } },
    };
    mocks.readBoard.mockResolvedValue({
      ok: true,
      value: { ownerType: "space", ownerId: projectId, snapshot: JSON.stringify(escena), revision: 2, updatedAt: 10 },
    });
    mocks.saveBoard.mockImplementation(async (input: { snapshot: string }) => ({
      ok: true,
      value: { ownerType: "space", ownerId: projectId, snapshot: input.snapshot, revision: 3, updatedAt: 20 },
    }));

    const body = await call("anadir_a_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      revision: 2,
      elementos: [{ tipo: "rectangulo", x: 1, y: 2, ancho: 10, alto: 10 }],
    });
    expect(body).toMatchObject({ revision: 3, updatedAt: 20, anadidos: 1, sincronizada: true });

    const saved = mocks.saveBoard.mock.calls[0][0] as { snapshot: string; revision: number };
    const parsed = JSON.parse(saved.snapshot) as { elements: Array<Record<string, unknown>>; appState: unknown; files: unknown; custom: string };
    expect(saved.revision).toBe(2);
    expect(parsed.elements).toHaveLength(2);
    expect(parsed.elements[1]).toMatchObject({ type: "rectangle", width: 10, height: 10 });
    expect(parsed.appState).toEqual({ zoom: { value: 1 } });
    expect(parsed.files).toEqual({ f1: { dataURL: "/api/files/f1" } });
    expect(parsed.custom).toBe("se conserva");
    expect(mocks.publicarEscena).toHaveBeenCalledWith(projectId, "space", projectId, saved.snapshot, 3);
    expect(mocks.saveBoard.mock.invocationCallOrder[0]).toBeLessThan(mocks.publicarEscena.mock.invocationCallOrder[0]);
  });

  it("guarda aunque no haya pestañas para publicar", async () => {
    mocks.publicarEscena.mockResolvedValue(false);
    const body = await call("anadir_a_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      revision: 2,
      elementos: [{ tipo: "texto", texto: "Hola", x: 0, y: 0 }],
    });
    expect(body).toMatchObject({ revision: 3, anadidos: 1, sincronizada: false });
    expect(mocks.saveBoard).toHaveBeenCalled();
  });

  it("devuelve conflict si la revisión leída no coincide antes de construir", async () => {
    mocks.readBoard.mockResolvedValue({
      ok: true,
      value: { ownerType: "space", ownerId: projectId, snapshot: '{"elements":[]}', revision: 3, updatedAt: 10 },
    });
    const body = await call("anadir_a_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      revision: 2,
      elementos: [{ tipo: "elipse", x: 0, y: 0, ancho: 10, alto: 10 }],
    });
    expect(body.error).toMatchObject({ codigo: "conflict", estado: 409, revisionActual: 3 });
    expect(mocks.saveBoard).not.toHaveBeenCalled();
    expect(mocks.publicarEscena).not.toHaveBeenCalled();
  });

  it("rechaza una escena guardada que no es válida", async () => {
    mocks.readBoard.mockResolvedValue({
      ok: true,
      value: { ownerType: "space", ownerId: projectId, snapshot: "{no es json", revision: 2, updatedAt: 10 },
    });
    const body = await call("anadir_a_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      revision: 2,
      elementos: [{ tipo: "flecha", x: 0, y: 0, ancho: 10, alto: 10 }],
    });
    expect(body.error).toMatchObject({ codigo: "invalid", estado: 400 });
    expect(mocks.saveBoard).not.toHaveBeenCalled();
  });

  it("rechaza más de 50 elementos y tipos fuera de la lista", async () => {
    const demasiados = Array.from({ length: MAX_ELEMENTOS_ANADIDOS + 1 }, () => ({ tipo: "rectangulo", x: 0, y: 0, ancho: 1, alto: 1 }));
    const exceso = await call("anadir_a_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      revision: 2,
      elementos: demasiados,
    });
    expect(exceso.error).toMatchObject({ codigo: "invalid", estado: 400 });
    expect(mocks.resolverAppEnProyecto).not.toHaveBeenCalled();

    const desconocido = await call("anadir_a_pizarra", {
      proyectoId: projectId,
      tipo: "space",
      duenoId: projectId,
      revision: 2,
      elementos: [{ tipo: "cuadro", x: 0, y: 0, ancho: 1, alto: 1 }],
    });
    expect(desconocido.error).toMatchObject({ codigo: "invalid", estado: 400 });
    expect(mocks.saveBoard).not.toHaveBeenCalled();
  });
});
