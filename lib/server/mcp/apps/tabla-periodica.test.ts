import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ resolverAppInstalada: vi.fn() }));

vi.mock("./contrato", () => ({ resolverAppInstalada: mocks.resolverAppInstalada }));

import { herramientasTablaPeriodica } from "./tabla-periodica";

const tool = herramientasTablaPeriodica[0];
const caller = { userId: "u1", email: "docente@example.com" };

/**
 * Ejecuta la herramienta y devuelve su contenido estructurado.
 * @param args - Argumentos de la consulta.
 * @returns El payload o el error estructurado.
 */
async function consultar(args: Record<string, unknown>) {
  const result = await tool.handler(caller, args);
  return result.structuredContent as {
    elemento?: { numero: number; simbolo: string; nombre: string };
    error?: { codigo: string; estado: number; mensaje: string };
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolverAppInstalada.mockResolvedValue({
    ok: true,
    app: { id: "tabla-periodica", name: "Tabla periódica" },
  });
});

describe("consultar_elemento", () => {
  it("consulta por símbolo sin distinguir mayúsculas", async () => {
    const body = await consultar({ simbolo: "na" });
    expect(body.elemento).toMatchObject({ numero: 11, simbolo: "Na", nombre: "Sodio" });
    expect(mocks.resolverAppInstalada).toHaveBeenCalledWith("tabla-periodica");
  });

  it("consulta por número atómico", async () => {
    const body = await consultar({ numero: 26 });
    expect(body.elemento).toMatchObject({ numero: 26, simbolo: "Fe", nombre: "Hierro" });
  });

  it("rechaza enviar símbolo y número a la vez", async () => {
    const body = await consultar({ simbolo: "Na", numero: 11 });
    expect(body.error).toMatchObject({ codigo: "invalid", estado: 400 });
    expect(mocks.resolverAppInstalada).not.toHaveBeenCalled();
  });

  it("rechaza una consulta sin símbolo ni número", async () => {
    const body = await consultar({});
    expect(body.error).toMatchObject({ codigo: "invalid", estado: 400 });
    expect(mocks.resolverAppInstalada).not.toHaveBeenCalled();
  });

  it("responde not_found si el elemento no existe", async () => {
    const body = await consultar({ simbolo: "Xx" });
    expect(body.error).toMatchObject({ codigo: "not_found", estado: 404, mensaje: "No se encuentra el elemento." });
  });

  it("devuelve el error de la app si no está instalada", async () => {
    mocks.resolverAppInstalada.mockResolvedValue({
      ok: false,
      resultado: {
        content: [{ type: "text", text: "La aplicación no está instalada" }],
        structuredContent: { error: { codigo: "not_found", estado: 404, mensaje: "La aplicación no está instalada" } },
        isError: true,
      },
    });
    const body = await consultar({ simbolo: "H" });
    expect(body.error).toMatchObject({ codigo: "not_found", estado: 404, mensaje: "La aplicación no está instalada" });
  });
});
