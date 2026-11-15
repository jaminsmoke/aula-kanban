import { beforeEach, describe, expect, it, vi } from "vitest";

const projectId = "11111111-1111-4111-8111-111111111111";
const uploadId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const state = vi.hoisted(() => ({
  role: "teacher" as "owner" | "admin" | "teacher" | "student" | "guest",
  access: true,
  store: vi.fn(),
  find: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("../../project-access", () => ({
  PROJECT_FAILURE_RESPONSES: {
    unauthenticated: { status: 401, message: "Inicia sesión para continuar." },
    invalid: { status: 400, message: "Proyecto no válido." },
    not_found: { status: 404, message: "No se encuentra el proyecto." },
    forbidden: { status: 403, message: "No tienes acceso a este proyecto." },
  },
  findProject: async (id: string) => (id === projectId ? { id: projectId, name: "Proyecto", createdAt: 1 } : null),
  projectAccessForUser: async (id: string, user: { userId: string; email: string }) => {
    if (id !== projectId || !state.access) return null;
    return { user: { ...user, displayName: user.email, fullName: null }, role: state.role, studentSection: null, teacherId: null };
  },
}));
vi.mock("../../storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../storage")>();
  return { ...actual, storeUpload: state.store, findUpload: state.find };
});

import { MAX_IMAGE_BYTES, StorageUnavailableError } from "../../storage";
import type { McpCaller } from "../contexto";
import { herramientasArchivos } from "./archivos";

const row = {
  id: uploadId,
  projectId,
  storageKey: `${projectId}/task-image/${uploadId}.png`,
  url: `/api/files/${uploadId}`,
  mimeType: "image/png",
  sizeBytes: 4,
  purpose: "task-image",
  ownerUserId: "u-teacher",
  createdAt: 1,
};

const tool = (name: string) => herramientasArchivos.find((item) => item.name === name)!;
const caller: McpCaller = { userId: "u-teacher", email: "teacher@example.com", origen: "https://site.test" };

async function llamar(name: string, args: Record<string, unknown>) {
  const result = await tool(name).handler(caller, args);
  return result as { isError?: boolean; structuredContent?: { error?: { codigo?: string }; archivo?: Record<string, unknown> } };
}

describe("herramientas de archivos", () => {
  beforeEach(() => {
    state.role = "teacher";
    state.access = true;
    state.store.mockReset().mockResolvedValue({ id: uploadId, url: `/api/files/${uploadId}` });
    state.find.mockReset().mockResolvedValue(row);
  });

  it("sube un documento con los mismos límites y devuelve metadatos y enlace", async () => {
    const result = await llamar("subir_archivo", {
      proyectoId: projectId,
      finalidad: "document",
      nombre: "nota.txt",
      tipoMime: "text/plain",
      contenidoBase64: Buffer.from("hola").toString("base64"),
    });
    expect(result.isError).toBeUndefined();
    expect(state.store).toHaveBeenCalledTimes(1);
    const input = state.store.mock.calls[0][0] as { file: File; projectId: string };
    expect(input.projectId).toBe(projectId);
    expect(input.file).toBeInstanceOf(File);
    expect(input.file.name).toBe("nota.txt");
    expect(input.file.type).toBe("text/plain");
    expect(input.file.size).toBe(4);
    expect(result.structuredContent?.archivo).toMatchObject({
      id: uploadId,
      proyectoId: projectId,
      tipoMime: "image/png",
      tamanoBytes: 4,
      finalidad: "task-image",
      enlace: `https://site.test/api/files/${uploadId}`,
    });
  });

  it("impide subir a una cuenta invitada", async () => {
    state.role = "guest";
    const result = await llamar("subir_archivo", {
      proyectoId: projectId,
      finalidad: "task-image",
      nombre: "foto.png",
      tipoMime: "image/png",
      contenidoBase64: "aG9sYQ==",
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent?.error?.codigo).toBe("forbidden");
    expect(state.store).not.toHaveBeenCalled();
  });

  it("rechaza base64 y tipos MIME inválidos antes de guardar", async () => {
    const base64 = await llamar("subir_archivo", {
      proyectoId: projectId,
      finalidad: "task-image",
      nombre: "foto.png",
      tipoMime: "image/png",
      contenidoBase64: "%%%",
    });
    expect(base64.structuredContent?.error?.codigo).toBe("invalid");
    const mime = await llamar("subir_archivo", {
      proyectoId: projectId,
      finalidad: "task-image",
      nombre: "nota.txt",
      tipoMime: "text/plain",
      contenidoBase64: "aG9sYQ==",
    });
    expect(mime.structuredContent?.error?.codigo).toBe("invalid");
    expect(state.store).not.toHaveBeenCalled();
  });

  it("responde too_large por encima del límite de imagen", async () => {
    const result = await llamar("subir_archivo", {
      proyectoId: projectId,
      finalidad: "task-image",
      nombre: "grande.png",
      tipoMime: "image/png",
      contenidoBase64: Buffer.alloc(MAX_IMAGE_BYTES + 1).toString("base64"),
    });
    expect(result.structuredContent?.error?.codigo).toBe("too_large");
    expect(state.store).not.toHaveBeenCalled();
  });

  it("responde unavailable cuando R2 no está configurado", async () => {
    state.store.mockRejectedValue(new StorageUnavailableError());
    const result = await llamar("subir_archivo", {
      proyectoId: projectId,
      finalidad: "task-image",
      nombre: "foto.png",
      tipoMime: "image/png",
      contenidoBase64: "aG9sYQ==",
    });
    expect(result.structuredContent?.error?.codigo).toBe("unavailable");
  });

  it("obtiene metadatos sin descargar el binario, también para invitados", async () => {
    state.role = "guest";
    const result = await llamar("obtener_archivo", { proyectoId: projectId, archivoId: uploadId });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.archivo).toMatchObject({ id: uploadId, tipoMime: "image/png", enlace: `https://site.test/api/files/${uploadId}` });
    expect(state.find).toHaveBeenCalledWith(uploadId);
  });

  it("oculta un archivo de otro proyecto y devuelve 404", async () => {
    state.find.mockResolvedValue({ ...row, projectId: "otro-proyecto" });
    const result = await llamar("obtener_archivo", { proyectoId: projectId, archivoId: uploadId });
    expect(result.structuredContent?.error?.codigo).toBe("not_found");
  });

  it("distingue sin acceso y proyecto inexistente", async () => {
    state.access = false;
    const forbidden = await llamar("obtener_archivo", { proyectoId: projectId, archivoId: uploadId });
    expect(forbidden.structuredContent?.error?.codigo).toBe("forbidden");
    const missing = await llamar("obtener_archivo", { proyectoId: "22222222-2222-4222-8222-222222222222", archivoId: uploadId });
    expect(missing.structuredContent?.error?.codigo).toBe("not_found");
  });
});
