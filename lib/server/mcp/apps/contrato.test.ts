import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  listInstalledApps: vi.fn(),
}));

vi.mock("../contexto", () => ({
  resolve: mocks.resolve,
  toChatGPTUser: (caller: { userId: string; email: string }) => ({
    userId: caller.userId,
    email: caller.email,
    displayName: caller.email,
    fullName: null,
  }),
  errorHerramienta: (codigo: string, mensaje: string, detalle?: Record<string, unknown>) => ({
    content: [{ type: "text", text: mensaje }],
    structuredContent: {
      error: {
        codigo,
        estado: codigo === "not_found" ? 404 : codigo === "forbidden" ? 403 : 500,
        mensaje,
        ...detalle,
      },
    },
    isError: true,
  }),
  falloResolucion: (resolved: { codigo: string; mensaje: string }) => ({
    content: [{ type: "text", text: resolved.mensaje }],
    structuredContent: {
      error: {
        codigo: resolved.codigo,
        estado: resolved.codigo === "forbidden" ? 403 : 404,
        mensaje: resolved.mensaje,
      },
    },
    isError: true,
  }),
}));

vi.mock("../../apps", () => ({ listInstalledApps: mocks.listInstalledApps }));

import { APP_INVITADO_SIN_ESCRITURA, APP_NO_EXISTE, APP_NO_INSTALADA, resolverAppEnProyecto, resolverAppInstalada } from "./contrato";

const projectId = "11111111-1111-4111-8111-111111111111";
const caller = { userId: "u-owner", email: "owner@example.com" };
const project = { id: projectId, name: "Proyecto uno", createdAt: 1 };
const access = {
  user: { userId: "u-owner", email: "owner@example.com", displayName: "owner@example.com", fullName: null },
  role: "owner" as const,
  studentSection: null,
  teacherId: null,
};

/**
 * Lee el error estructurado de un resultado fallido.
 * @param result - Resultado de la resolución.
 * @returns El error con código, estado y mensaje.
 */
function errorOf(result: { ok: boolean } & Record<string, unknown>) {
  if (result.ok) throw new Error("Se esperaba un fallo");
  return (result.resultado as { structuredContent: { error: { codigo: string; estado: number; mensaje: string } } }).structuredContent.error;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listInstalledApps.mockResolvedValue([
    { id: "tabla-periodica", status: "installed", version: "1.0.0" },
  ]);
});

describe("contrato MCP de apps", () => {
  it("acepta una app instalada", async () => {
    const result = await resolverAppInstalada("tabla-periodica");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.app.id).toBe("tabla-periodica");
  });

  it("responde not_found si la app no existe, sin consultar la instalación", async () => {
    const result = await resolverAppInstalada("no-existe");
    expect(errorOf(result)).toMatchObject({ codigo: "not_found", estado: 404, mensaje: APP_NO_EXISTE });
    expect(mocks.listInstalledApps).not.toHaveBeenCalled();
  });

  it("responde not_found si la app existe pero no está instalada", async () => {
    mocks.listInstalledApps.mockResolvedValue([{ id: "tabla-periodica", status: "not_installed", version: null }]);
    const result = await resolverAppInstalada("tabla-periodica");
    expect(errorOf(result)).toMatchObject({ codigo: "not_found", estado: 404, mensaje: APP_NO_INSTALADA });
  });

  it("devuelve el fallo del proyecto antes de comprobar la app", async () => {
    mocks.resolve.mockResolvedValue({ ok: false, codigo: "forbidden", mensaje: "No tienes acceso a este proyecto." });
    const result = await resolverAppEnProyecto(caller, { proyectoId: projectId, appId: "tabla-periodica" });
    expect(errorOf(result)).toMatchObject({ codigo: "forbidden", estado: 403 });
    expect(mocks.listInstalledApps).not.toHaveBeenCalled();
  });

  it("devuelve proyecto, acceso y app cuando todo está resuelto", async () => {
    mocks.resolve.mockResolvedValue({ ok: true, project, access });
    const result = await resolverAppEnProyecto(caller, { proyectoId: projectId, appId: "tabla-periodica" });
    expect(result).toMatchObject({ ok: true, project, access, app: { id: "tabla-periodica" } });
  });

  it("deja leer a un invitado, pero no escribir", async () => {
    const guest = { ...access, role: "guest" as const };
    mocks.resolve.mockResolvedValue({ ok: true, project, access: guest });

    const lectura = await resolverAppEnProyecto(caller, { proyectoId: projectId, appId: "tabla-periodica" });
    expect(lectura.ok).toBe(true);

    const escritura = await resolverAppEnProyecto(caller, { proyectoId: projectId, appId: "tabla-periodica", escritura: true });
    expect(errorOf(escritura)).toMatchObject({ codigo: "forbidden", estado: 403, mensaje: APP_INVITADO_SIN_ESCRITURA });
  });
});
