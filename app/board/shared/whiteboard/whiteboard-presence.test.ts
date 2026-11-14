import { describe, expect, it, vi } from "vitest";
import { createWhiteboardPresence } from "./whiteboard-presence";

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  receive(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

describe("presencia de whiteboard", () => {
  it("abre el socket, distribuye escenas/presencia y cierra", () => {
    vi.stubGlobal("WebSocket", MockWebSocket);
    const onScene = vi.fn();
    const onPresence = vi.fn();
    const onLeave = vi.fn();
    const presence = createWhiteboardPresence({ boardId: "board-1", ownerType: "space", onScene, onPresence, onLeave });

    presence.start();
    const socket = MockWebSocket.instances.at(-1)!;
    expect(socket.url).toContain("/api/board-socket?");
    socket.open();
    expect(socket.sent[0]).toContain('"type":"presence"');

    socket.receive({ type: "scene", snapshot: "{}" });
    expect(onScene).toHaveBeenCalledWith("{}");
    socket.receive({ type: "presence", userId: "u1", email: "a@example.com", pointer: { x: 1, y: 2 } });
    expect(onPresence).toHaveBeenCalledWith("u1", { email: "a@example.com", pointer: { x: 1, y: 2 } });
    socket.receive({ type: "leave", userId: "u1" });
    expect(onLeave).toHaveBeenCalledWith("u1");

    presence.send({ type: "presence", pointer: null });
    expect(socket.sent.at(-1)).toContain('"type":"presence"');

    presence.stop();
    expect(socket.readyState).toBe(3);
  });
});
