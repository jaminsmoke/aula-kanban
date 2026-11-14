import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../../vitest.setup";
import type { BoardElement } from "./whiteboard-model";
import { useWhiteboard } from "./use-whiteboard";

const board = {
  ownerType: "space",
  ownerId: "default",
  snapshot: JSON.stringify({ type: "excalidraw", version: 2, elements: [], appState: {}, files: {} }),
  revision: 1,
  updatedAt: 1,
};

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }
}

function element(): BoardElement {
  return { id: "shape-1", version: 1, versionNonce: 2 };
}

describe("useWhiteboard", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  it("carga la pizarra y guarda los cambios tras el debounce", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") return jsonResponse({ ...board, revision: 2, updatedAt: 2 });
      return jsonResponse(board);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWhiteboard({ boardId: "board-1", ownerType: "space", readOnly: false }));
    await waitFor(() => expect(result.current.initial).not.toBeNull());
    expect(result.current.error).toBe("");
    expect(FakeWebSocket.instances[0]?.url).toContain("/api/board-socket?");

    act(() => result.current.handleChange([element()], { viewBackgroundColor: "#fff" }, {}));
    expect(result.current.status).toBe("La pizarra se está guardando…");

    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 850)); });

    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(put).toBeTruthy();
    const body = JSON.parse(String(put?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ ownerType: "space", ownerId: "board-1", revision: 1 });
    expect(String(body.snapshot)).toContain("shape-1");
    expect(result.current.status).toBe("");
  });

  it("muestra el error de carga y vuelve a pedir la pizarra al reintentar", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    let attempts = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("sin red");
      return jsonResponse(board);
    }));

    const { result } = renderHook(() => useWhiteboard({ boardId: "board-2", ownerType: "task", readOnly: true }));
    await waitFor(() => expect(result.current.error).toContain("No se pudo cargar la pizarra"));

    act(() => result.current.retry());
    await waitFor(() => expect(attempts).toBe(2));
    await waitFor(() => expect(result.current.initial).not.toBeNull());
    expect(result.current.error).toBe("");
  });
});
