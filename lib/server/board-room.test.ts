import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({
  DurableObject: class {
    ctx: unknown;
    env: unknown;
    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx;
      this.env = env;
    }
  },
}));

import { MAX_BOARD_LIVE_BYTES } from "../domain/boards/excalidraw-elements";
import { BoardRoom } from "./board-room";

type Socket = { readyState: number; send: ReturnType<typeof vi.fn> };
let sockets: Socket[];

beforeEach(() => {
  sockets = [];
});

/**
 * Crea una sala con sockets simulados.
 * @returns La sala y el contexto falso.
 */
function sala() {
  const ctx = { getWebSockets: () => sockets };
  return new BoardRoom(ctx as never, {} as never);
}

describe("BoardRoom.publicarEscena", () => {
  it("envía la escena guardada a las pestañas abiertas", async () => {
    const abierta = { readyState: 1, send: vi.fn() };
    const cerrada = { readyState: 3, send: vi.fn() };
    sockets = [abierta, cerrada];
    expect(await sala().publicarEscena('{"elements":[1]}', 3)).toBe(true);
    expect(abierta.send).toHaveBeenCalledWith(JSON.stringify({ type: "scene", snapshot: '{"elements":[1]}', revision: 3 }));
    expect(cerrada.send).not.toHaveBeenCalled();
  });

  it("devuelve false sin pestañas o con una escena demasiado grande", async () => {
    expect(await sala().publicarEscena('{"elements":[]}', 1)).toBe(false);
    const abierta = { readyState: 1, send: vi.fn() };
    sockets = [abierta];
    expect(await sala().publicarEscena("x".repeat(MAX_BOARD_LIVE_BYTES + 1), 1)).toBe(false);
    expect(abierta.send).not.toHaveBeenCalled();
  });

  it("sigue publicando al resto si un socket falla", async () => {
    const rota = { readyState: 1, send: vi.fn(() => { throw new Error("cerrado"); }) };
    const abierta = { readyState: 1, send: vi.fn() };
    sockets = [rota, abierta];
    expect(await sala().publicarEscena('{"elements":[]}', 1)).toBe(true);
    expect(abierta.send).toHaveBeenCalled();
  });
});
