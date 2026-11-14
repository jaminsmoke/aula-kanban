import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../../vitest.setup";

const board = {
  ownerType: "space",
  ownerId: "board-2",
  snapshot: JSON.stringify({ type: "excalidraw", version: 2, elements: [], appState: {}, files: {} }),
  revision: 1,
  updatedAt: 1,
};

vi.mock("./whiteboard-canvas", () => ({
  default: ({ initial }: { initial: { elements?: unknown[] } }) => (
    <div data-testid="whiteboard-canvas">{initial.elements?.length ?? 0}</div>
  ),
}));

class FakeWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor(readonly url: string) {}
}

describe("Whiteboard", () => {
  beforeEach(() => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  it("recupera el lienzo al reintentar una carga que había fallado", async () => {
    let attempts = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) return jsonResponse({ message: "sin conexión" }, false, 500);
      return jsonResponse(board);
    }));

    const Whiteboard = (await import("./whiteboard")).default;
    render(<Whiteboard readOnly ownerType="space" ownerId="board-2" />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/No se pudo cargar la pizarra/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByTestId("whiteboard-canvas")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(attempts).toBe(2);
  });
});
