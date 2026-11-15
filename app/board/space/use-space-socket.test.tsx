import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpaceSocket } from "./use-space-socket";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  readyState = 1;
  sent: string[] = [];
  listeners = new Map<string, Set<(event: { data: string }) => void>>();
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: { data: string }) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: { data: string }) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }

  receive(payload: unknown) {
    const event = { data: JSON.stringify(payload) };
    this.listeners.get("message")?.forEach((listener) => listener(event));
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { protocol: "http:", host: "localhost:5173" },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSpaceSocket", () => {
  it("conecta a /api/space-socket con el proyecto y publica el estado", () => {
    const { result } = renderHook(() => useSpaceSocket("p1"));
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toContain("/api/space-socket?project=p1");
    act(() => {
      result.current.publicarEstado([{ appId: "mermaid", abierta: true, minimizada: false, ampliada: false }]);
    });
    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toEqual({ type: "estado", ventanas: [{ appId: "mermaid", abierta: true, minimizada: false, ampliada: false }] });
  });

  it("distribuye comandos válidos e ignora mensajes ajenos", () => {
    const { result } = renderHook(() => useSpaceSocket("p1"));
    const handler = vi.fn();
    act(() => {
      result.current.alComando(handler);
    });
    const socket = FakeWebSocket.instances[0];
    act(() => {
      socket.receive({ type: "comando", accion: "abrir", appId: "mermaid" });
    });
    expect(handler).toHaveBeenCalledWith({ type: "comando", accion: "abrir", appId: "mermaid" });
    act(() => {
      socket.receive({ type: "comando", accion: "inexistente", appId: "mermaid" });
      socket.receive({ type: "otra", accion: "abrir", appId: "mermaid" });
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("cierra al desmontar", () => {
    const { unmount } = renderHook(() => useSpaceSocket("p1"));
    const socket = FakeWebSocket.instances[0];
    unmount();
    expect(socket.closed).toBe(true);
  });
});
