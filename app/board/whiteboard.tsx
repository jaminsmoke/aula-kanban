"use client";

import "@excalidraw/excalidraw/index.css";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { RequestError, request } from "./api";

type BoardElement = { id: string; version: number; versionNonce?: number; isDeleted?: boolean; [key: string]: unknown };
type BoardFile = { mimeType?: string; id?: string; dataURL?: string; status?: string; error?: unknown; created?: number };
type BoardSnapshot = { type?: string; version?: number; source?: string; elements?: BoardElement[]; appState?: Record<string, unknown>; files?: Record<string, BoardFile> };
type BoardResponse = { ownerType: string; ownerId: string; snapshot: string; revision: number; updatedAt: number };

const EMPTY_SNAPSHOT: BoardSnapshot = { type: "excalidraw", version: 2, source: "aula-kanban", elements: [], appState: {}, files: {} };
const SAVE_DEBOUNCE_MS = 800;
const BROADCAST_DEBOUNCE_MS = 150;
const POLL_MS = 5000;
const RECONNECT_MS = 5000;
const PRESENCE_COLORS = ["#e03131", "#2f9e44", "#1971c2", "#f08c00", "#9c36b5", "#0ca678"];

/**
 * Fusiona elementos locales y remotos con último-escritura-gana.
 * @param local - Elementos actuales de la pizarra.
 * @param remote - Elementos que llegan de otra vista.
 * @returns Los elementos fusionados, incluidas las tumbas de borrado.
 */
function mergeElements(local: BoardElement[], remote: BoardElement[]) {
  const map = new Map(local.map((element) => [element.id, element]));
  for (const element of remote) {
    const current = map.get(element.id);
    if (!current || (element.version ?? 0) > (current.version ?? 0) || ((element.version ?? 0) === (current.version ?? 0) && (element.versionNonce ?? 0) > (current.versionNonce ?? 0))) {
      map.set(element.id, element);
    }
  }
  return [...map.values()];
}

/**
 * Elige un color de presencia estable a partir del identificador de la cuenta.
 * @param userId - Identificador de la cuenta.
 * @returns Un color hexadecimal de la paleta de presencia.
 */
function colorForUser(userId: string) {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

/**
 * Interpreta un snapshot guardado; si está vacío o corrupto devuelve plantilla vacía.
 * @param raw - Cadena JSON del snapshot o vacía.
 * @returns El snapshot con elementos, estado y ficheros.
 */
function parseSnapshot(raw: string): BoardSnapshot {
  if (!raw) return EMPTY_SNAPSHOT;
  try {
    const parsed = JSON.parse(raw) as BoardSnapshot;
    if (!parsed || !Array.isArray(parsed.elements)) return EMPTY_SNAPSHOT;
    // `appState.collaborators` es un `Map` en memoria: no sobrevive al JSON
    // (`{}`) y Excalidraw espera un `Map` al recargar la escena.
    const appState = { ...(parsed.appState ?? {}) };
    delete appState.collaborators;
    return { ...EMPTY_SNAPSHOT, ...parsed, appState, files: parsed.files ?? {} };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

/**
 * Sube un blob de imagen de la pizarra al almacenamiento y devuelve su URL interna.
 * @param dataUrl - Imagen embebida como `data:`.
 * @param mimeType - Tipo MIME de la imagen.
 * @returns La URL interna (`/api/files/…`) o `null` si no se pudo subir.
 */
async function uploadBlob(dataUrl: string, mimeType: string) {
  try {
    const projectId = new URLSearchParams(window.location.search).get("project") || "default";
    const blob = await (await fetch(dataUrl)).blob();
    const body = new FormData();
    body.append("file", new File([blob], "board-image", { type: mimeType || blob.type || "image/png" }));
    body.append("purpose", "board-asset");
    const response = await fetch(`/api/uploads?project=${encodeURIComponent(projectId)}`, { method: "POST", body });
    const data = await response.json().catch(() => null) as { url?: unknown } | null;
    if (!response.ok || typeof data?.url !== "string") return null;
    return data.url as string;
  } catch {
    return null;
  }
}

/**
 * Firma barata de la escena: número de elementos y suma de sus versiones y
 * nonces, más los ficheros. Excalidraw dispara `onChange` también ante
 * cambios de `appState` (por ejemplo el puntero); sin esta comparación cada
 * movimiento del ratón reiniciaría el temporizador de guardado.
 * @param elements - Elementos de la escena.
 * @param files - Ficheros (blobs) de la escena.
 * @returns Cadena comparable de igualdad.
 */
function sceneSignature(elements: readonly BoardElement[], files: Record<string, BoardFile>): string {
  let total = 0;
  for (const element of elements) total += (element?.version ?? 0) + (element?.versionNonce ?? 0);
  let fileTotal = 0;
  for (const file of Object.values(files)) fileTotal += file?.dataURL?.length ?? 0;
  return `${elements.length}:${total}:${Object.keys(files).length}:${fileTotal}`;
}

/**
 * Pizarra de la tarea con Excalidraw, persistida en la API del tablero.
 * @param props - Tarea dueña y bandera de solo lectura.
 * @returns La pizarra con sus estados de carga y error.
 */
export default function Whiteboard({ taskId, readOnly }: { taskId: string; readOnly: boolean }) {
  const [initial, setInitial] = useState<BoardSnapshot | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("La pizarra se está guardando…");
  const [retry, setRetry] = useState(0);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const snapshotRef = useRef(EMPTY_SNAPSHOT);
  const updatedAtRef = useRef(0);
  const revisionRef = useRef(0);
  const editSequenceRef = useRef(0);
  const savingRef = useRef(false);
  const persistRef = useRef<(() => Promise<void>) | null>(null);
  const uploadedRef = useRef(new Map<string, string>());
  const saveTimer = useRef<number | undefined>(undefined);
  const broadcastTimer = useRef<number | undefined>(undefined);
  const presenceTimer = useRef<number | undefined>(undefined);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const uploadingRef = useRef(new Set<string>());
  const dirtyRef = useRef(false);
  const signatureRef = useRef("");
  const socketRef = useRef<WebSocket | null>(null);
  const socketOpenRef = useRef(false);
  const presenceRef = useRef(new Map<string, { email: string; pointer: { x: number; y: number } | null }>());

  const fetchBoard = useCallback(async (): Promise<BoardResponse> => {
    const projectId = new URLSearchParams(window.location.search).get("project") || "default";
    const query = new URLSearchParams({ project: projectId, ownerType: "task", ownerId: taskId });
    const response = await fetch(`/api/boards?${query}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || data === null) throw new Error("pizarra");
    return data as BoardResponse;
  }, [taskId]);

  const [previousTaskId, setPreviousTaskId] = useState(taskId);
  if (previousTaskId !== taskId) {
    setPreviousTaskId(taskId);
    setInitial(null);
    setError("");
  }

  useEffect(() => {
    let active = true;
    fetchBoard().then(
      (board) => {
        if (!active) return;
        const parsed = parseSnapshot(board.snapshot);
        snapshotRef.current = parsed;
        signatureRef.current = sceneSignature(parsed.elements ?? [], parsed.files ?? {});
        updatedAtRef.current = board.updatedAt;
        revisionRef.current = board.revision;
        for (const [fileId, file] of Object.entries(parsed.files ?? {})) {
          if (file?.dataURL && !file.dataURL.startsWith("data:")) uploadedRef.current.set(fileId, file.dataURL);
        }
        setInitial(parsed);
        setStatus("");
      },
      () => {
        if (active) {
          setInitial(null);
          setError("No se pudo cargar la pizarra. Revisa tu conexión e inténtalo de nuevo.");
        }
      },
    );
    return () => { active = false; };
  }, [fetchBoard, retry, taskId]);

  const persist = useCallback(async (): Promise<void> => {
    if (readOnly || !dirtyRef.current || savingRef.current) return;
    savingRef.current = true;
    const sequence = editSequenceRef.current;
    let retryAfterConflict = false;
    const next = snapshotRef.current;
    const files = { ...(next.files ?? {}) };
    try {
    for (const [fileId, file] of Object.entries(files)) {
      if (file?.dataURL?.startsWith("data:") && uploadedRef.current.has(fileId)) {
        files[fileId] = { ...file, dataURL: uploadedRef.current.get(fileId), status: "saved" };
      } else if (file?.dataURL?.startsWith("data:") && !uploadingRef.current.has(fileId)) {
        uploadingRef.current.add(fileId);
        try {
          const url = await uploadBlob(file.dataURL, file.mimeType || "");
          if (url) {
            uploadedRef.current.set(fileId, url);
            files[fileId] = { ...file, dataURL: url, status: "saved" };
          } else {
            throw new Error("No se pudo subir una imagen de la pizarra.");
          }
        } finally {
          uploadingRef.current.delete(fileId);
        }
      }
    }
    const snap = JSON.stringify({ ...next, appState: EMPTY_SNAPSHOT.appState, files });
      const saved = await request<BoardResponse>("PUT", { ownerType: "task", ownerId: taskId, snapshot: snap, revision: revisionRef.current }, "/api/boards");
      revisionRef.current = saved.revision;
      updatedAtRef.current = saved.updatedAt;
      if (socketOpenRef.current && socketRef.current) {
        socketRef.current.send(JSON.stringify({ type: "scene", snapshot: snap }));
      }
      if (sequence === editSequenceRef.current) {
        snapshotRef.current = { ...next, files };
        signatureRef.current = sceneSignature(next.elements ?? [], files);
        dirtyRef.current = false;
        setStatus("");
      } else {
        dirtyRef.current = true;
        setStatus("Guardando los últimos cambios…");
      }
    } catch (error) {
      if (error instanceof RequestError && error.status === 409) {
        try {
          const remote = await fetchBoard();
          const parsed = parseSnapshot(remote.snapshot);
          const current = snapshotRef.current;
          const merged = mergeElements(current.elements ?? [], parsed.elements ?? []);
          const mergedFiles = { ...(parsed.files ?? {}), ...(current.files ?? {}) };
          snapshotRef.current = { ...current, elements: merged, files: mergedFiles };
          signatureRef.current = sceneSignature(merged, mergedFiles);
          revisionRef.current = remote.revision;
          updatedAtRef.current = remote.updatedAt;
          apiRef.current?.updateScene({ elements: merged as never, captureUpdate: "NEVER" });
          dirtyRef.current = true;
          retryAfterConflict = true;
          setStatus("Combinando cambios de otra sesión…");
        } catch {
          setStatus("No se pudo actualizar la pizarra; los cambios siguen pendientes.");
        }
      } else {
        retryAfterConflict = true;
        setStatus("No se pudo guardar la pizarra o una imagen; se volverá a intentar.");
      }
    } finally {
      savingRef.current = false;
      if (dirtyRef.current && (retryAfterConflict || sequence !== editSequenceRef.current)) {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => { void persistRef.current?.(); }, SAVE_DEBOUNCE_MS);
      }
    }
  }, [fetchBoard, readOnly, taskId]);

  useEffect(() => {
    persistRef.current = persist;
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (broadcastTimer.current) window.clearTimeout(broadcastTimer.current);
      if (presenceTimer.current) window.clearTimeout(presenceTimer.current);
      if (dirtyRef.current) void persist();
      persistRef.current = null;
    };
  }, [persist]);

  const applyScene = useCallback((raw: string) => {
    const parsed = parseSnapshot(raw);
    const current = snapshotRef.current;
    const merged = mergeElements(current.elements ?? [], parsed.elements ?? []);
    const files = { ...(current.files ?? {}), ...(parsed.files ?? {}) };
    snapshotRef.current = { ...current, elements: merged, files };
    if (dirtyRef.current || savingRef.current) editSequenceRef.current++;
    signatureRef.current = sceneSignature(merged, files);
    const fileList = Object.values(files);
    if (fileList.length) apiRef.current?.addFiles(fileList as never);
    apiRef.current?.updateScene({ elements: merged as never, captureUpdate: "NEVER" });
  }, []);

  const pushPresence = useCallback(() => {
    const collaborators = new Map<string, unknown>();
    for (const [userId, presence] of presenceRef.current) {
      collaborators.set(userId, { id: userId, button: "down", username: presence.email, pointer: presence.pointer, selectedElements: {}, color: colorForUser(userId) });
    }
    apiRef.current?.updateScene({ appState: { collaborators: collaborators as never }, captureUpdate: "NEVER" });
  }, []);

  useEffect(() => {
    if (!initial) return;
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    const connect = () => {
      if (!active) return;
      const projectId = new URLSearchParams(window.location.search).get("project") || "default";
      const query = new URLSearchParams({ project: projectId, ownerType: "task", ownerId: taskId });
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/api/board-socket?${query}`);
      socketRef.current = socket;
      socket.onopen = () => {
        socketOpenRef.current = true;
        socket?.send(JSON.stringify({ type: "presence", pointer: null }));
      };
      socket.onmessage = (event: MessageEvent) => {
        let data: { type?: string; snapshot?: string; userId?: string; email?: string; pointer?: { x: number; y: number } | null };
        try {
          data = JSON.parse(event.data) as typeof data;
        } catch {
          return;
        }
        if (data.type === "scene" && typeof data.snapshot === "string") applyScene(data.snapshot);
        else if (data.type === "presence" && data.userId) {
          presenceRef.current.set(data.userId, { email: data.email || data.userId, pointer: data.pointer ?? null });
          pushPresence();
        } else if (data.type === "leave" && data.userId) {
          presenceRef.current.delete(data.userId);
          pushPresence();
        }
      };
      const giveUp = () => {
        if (!active) return;
        socketOpenRef.current = false;
        socketRef.current = null;
        reconnectTimer = window.setTimeout(connect, RECONNECT_MS);
      };
      socket.onclose = giveUp;
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socketOpenRef.current = false;
      try { socket?.close(); } catch { /* el socket ya está cerrado */ }
    };
  }, [applyScene, pushPresence, initial, taskId]);

  useEffect(() => {
    const tick = () => {
      if (!document.hidden && !dirtyRef.current && !socketOpenRef.current) {
        fetchBoard().then((board) => {
          if (board.updatedAt > updatedAtRef.current && board.snapshot && board.snapshot.length > 0) {
            const parsed = parseSnapshot(board.snapshot);
            snapshotRef.current = parsed;
            signatureRef.current = sceneSignature(parsed.elements ?? [], parsed.files ?? {});
            updatedAtRef.current = board.updatedAt;
            revisionRef.current = board.revision;
            apiRef.current?.updateScene({ elements: (parsed.elements ?? []) as never, captureUpdate: "NEVER" });
          }
        }).catch(() => { /* el siguiente sondeo reintenta */ });
      }
    };
    const timer = Number(window.setInterval(tick, POLL_MS));
    return () => window.clearInterval(timer);
  }, [fetchBoard]);

  const handleChange = useCallback((elements: readonly BoardElement[], appState: Record<string, unknown>, files: Record<string, BoardFile>) => {
    if (readOnly) return;
    snapshotRef.current = { ...EMPTY_SNAPSHOT, elements: elements as BoardElement[], appState, files };
    const signature = sceneSignature(elements, files);
    if (signature === signatureRef.current) return;
    signatureRef.current = signature;
    dirtyRef.current = true;
    editSequenceRef.current++;
    setStatus("La pizarra se está guardando…");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { void persist(); }, SAVE_DEBOUNCE_MS);
    if (broadcastTimer.current) window.clearTimeout(broadcastTimer.current);
    broadcastTimer.current = window.setTimeout(() => {
      const socket = socketRef.current;
      if (!socketOpenRef.current || !socket) return;
      const sharedFiles = Object.fromEntries(Object.entries(snapshotRef.current.files ?? {}).filter(([, file]) => !file?.dataURL?.startsWith("data:")));
      socket.send(JSON.stringify({ type: "scene", snapshot: JSON.stringify({ ...EMPTY_SNAPSHOT, elements: snapshotRef.current.elements, appState: {}, files: sharedFiles }) }));
    }, BROADCAST_DEBOUNCE_MS);
  }, [persist, readOnly]);

  const handlePointer = useCallback((payload: { pointer?: { x: number; y: number } }) => {
    const pointer = payload?.pointer;
    if (!pointer) return;
    lastPointer.current = { x: pointer.x, y: pointer.y };
    if (presenceTimer.current) return;
    presenceTimer.current = window.setTimeout(() => {
      presenceTimer.current = undefined;
      const socket = socketRef.current;
      if (socketOpenRef.current && socket) socket.send(JSON.stringify({ type: "presence", pointer: lastPointer.current }));
    }, 50);
  }, []);

  if (error) {
    return (
      <div className="board-error" role="alert">
        <p>{error}</p>
        <button type="button" className="secondary" onClick={() => setRetry((count) => count + 1)}>Reintentar</button>
      </div>
    );
  }
  if (!initial) return <p className="board-loading" role="status">Cargando la pizarra…</p>;
  return (
    <div className="whiteboard">
      {status && <p className="board-status" aria-live="polite">{status}</p>}
      <div className="whiteboard-canvas">
        <Excalidraw
          excalidrawAPI={(api) => { apiRef.current = api; }}
          initialData={{ elements: initial.elements as never, appState: (initial.appState ?? {}) as never, files: initial.files as never }}
          onChange={handleChange as never}
          onPointerUpdate={handlePointer as never}
          viewModeEnabled={readOnly}
          zenModeEnabled
        />
      </div>
    </div>
  );
}
