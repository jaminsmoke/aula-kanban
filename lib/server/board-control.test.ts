import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock("cloudflare:workers", () => ({ env: state.env }));

import { MAX_BOARD_LIVE_BYTES } from "../domain/boards/excalidraw-elements";
import { publicarEscena } from "./board-control";

const projectId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  delete state.env.BOARD_ROOMS;
});

describe("publicación de escenas", () => {
  it("devuelve false sin binding de salas", async () => {
    expect(await publicarEscena(projectId, "space", projectId, '{"elements":[]}', 1)).toBe(false);
  });

  it("usa la sala de la pizarra y devuelve su resultado", async () => {
    const publicar = vi.fn().mockResolvedValue(true);
    const getByName = vi.fn(() => ({ publicarEscena: publicar }));
    state.env.BOARD_ROOMS = { getByName };
    expect(await publicarEscena(projectId, "task", "task1", '{"elements":[]}', 4)).toBe(true);
    expect(getByName).toHaveBeenCalledWith(`${projectId}:task:task1`);
    expect(publicar).toHaveBeenCalledWith('{"elements":[]}', 4);
  });

  it("devuelve false si la sala falla o no tiene pestañas", async () => {
    state.env.BOARD_ROOMS = { getByName: () => ({ publicarEscena: vi.fn().mockRejectedValue(new Error("sala")) }) };
    expect(await publicarEscena(projectId, "project", projectId, '{"elements":[]}', 2)).toBe(false);

    state.env.BOARD_ROOMS = { getByName: () => ({ publicarEscena: vi.fn().mockResolvedValue(false) }) };
    expect(await publicarEscena(projectId, "project", projectId, '{"elements":[]}', 2)).toBe(false);
  });

  it("no envía escenas mayores de 1 MB", async () => {
    const getByName = vi.fn();
    state.env.BOARD_ROOMS = { getByName };
    expect(await publicarEscena(projectId, "space", projectId, "x".repeat(MAX_BOARD_LIVE_BYTES + 1), 1)).toBe(false);
    expect(getByName).not.toHaveBeenCalled();
  });
});
