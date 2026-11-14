import { RECONNECT_MS } from "./whiteboard-model";

/** Presencia de una cuenta conectada a la pizarra. */
type PresenceUser = {
  email: string;
  pointer: { x: number; y: number } | null;
};

type PresenceMessage =
  | { type?: "scene"; snapshot?: string }
  | { type?: "presence"; userId?: string; email?: string; pointer?: { x: number; y: number } | null }
  | { type?: "leave"; userId?: string };

/** Conexión de presencia y escenas remotas de una pizarra. */
export type WhiteboardPresence = {
  start: () => void;
  stop: () => void;
  send: (payload: unknown) => void;
  isOpen: () => boolean;
};

/**
 * Crea la conexión WebSocket de una pizarra, con reconexión automática.
 * @param props - Dueño de la pizarra y callbacks de escena y presencia.
 * @returns La conexión controlable.
 */
export function createWhiteboardPresence({ boardId, ownerType, onScene, onPresence, onLeave }: {
  boardId: string;
  ownerType: "task" | "project" | "space";
  onScene: (snapshot: string) => void;
  onPresence: (userId: string, user: PresenceUser) => void;
  onLeave: (userId: string) => void;
}): WhiteboardPresence {
  let socket: WebSocket | null = null;
  let active = false;
  let reconnectTimer: number | undefined;

  const isOpen = () => socket?.readyState === WebSocket.OPEN;

  const connect = () => {
    if (!active) return;
    const projectId = new URLSearchParams(window.location.search).get("project") || "default";
    const query = new URLSearchParams({ project: projectId, ownerType, ownerId: boardId });
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${protocol}//${window.location.host}/api/board-socket?${query}`);
    socket.onopen = () => {
      socket?.send(JSON.stringify({ type: "presence", pointer: null }));
    };
    socket.onmessage = (event: MessageEvent) => {
      let data: PresenceMessage;
      try { data = JSON.parse(event.data) as PresenceMessage; } catch { return; }
      if (data.type === "scene" && typeof data.snapshot === "string") onScene(data.snapshot);
      else if (data.type === "presence" && data.userId) onPresence(data.userId, { email: data.email || data.userId, pointer: data.pointer ?? null });
      else if (data.type === "leave" && data.userId) onLeave(data.userId);
    };
    const reconnect = () => {
      if (!active) return;
      socket = null;
      reconnectTimer = window.setTimeout(connect, RECONNECT_MS);
    };
    socket.onclose = reconnect;
    socket.onerror = () => socket?.close();
  };

  return {
    start: () => {
      if (active) return;
      active = true;
      connect();
    },
    stop: () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      const current = socket;
      socket = null;
      try { current?.close(); } catch { /* el socket ya está cerrado */ }
    },
    send: (payload) => {
      if (isOpen()) socket?.send(JSON.stringify(payload));
    },
    isOpen,
  };
}
