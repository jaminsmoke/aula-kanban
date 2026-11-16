"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { RequestError } from "../api";
import {
  BROADCAST_DEBOUNCE_MS,
  EMPTY_SNAPSHOT,
  POLL_MS,
  SAVE_DEBOUNCE_MS,
  colorForUser,
  parseSnapshot,
  sceneSignature,
  type BoardElement,
  type BoardFile,
  type BoardSnapshot,
} from "./whiteboard-model";
import { fetchBoardSnapshot, mergeConflictSnapshot, mergeIncomingSnapshot, saveBoardSnapshot, uploadBoardFiles } from "./whiteboard-persistence";
import { createWhiteboardPresence, type WhiteboardPresence } from "./whiteboard-presence";

/**
 * Sincroniza una pizarra con la API y el socket de presencia.
 * @param props - Dueño, tipo, solo lectura e identificador de pizarra.
 * @returns Estado inicial, carga, guardado y handlers para Excalidraw.
 */
export function useWhiteboard({ boardId, ownerType, readOnly, live = true }: { boardId: string; ownerType: "task" | "project" | "space"; readOnly: boolean; live?: boolean }) {
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
  const presence = useRef<WhiteboardPresence | null>(null);
  const presenceUsers = useRef(new Map<string, { email: string; pointer: { x: number; y: number } | null }>());

  const loadBoard = useCallback(() => fetchBoardSnapshot(boardId, ownerType), [boardId, ownerType]);

  const [previousBoardId, setPreviousBoardId] = useState(boardId);
  if (previousBoardId !== boardId) {
    setPreviousBoardId(boardId);
    setInitial(null);
    setError("");
  }

  useEffect(() => {
    let active = true;
    loadBoard().then(
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
        setError("");
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
  }, [loadBoard, retry, boardId]);

  const persist = useCallback(async (): Promise<void> => {
    if (readOnly || !dirtyRef.current || savingRef.current) return;
    savingRef.current = true;
    const sequence = editSequenceRef.current;
    let retryAfterConflict = false;
    const next = snapshotRef.current;
    try {
      const files = await uploadBoardFiles(next.files ?? {}, uploadedRef.current, uploadingRef.current);
      const snap = JSON.stringify({ ...next, appState: EMPTY_SNAPSHOT.appState, files });
      const saved = await saveBoardSnapshot(boardId, ownerType, snap, revisionRef.current);
      revisionRef.current = saved.revision;
      updatedAtRef.current = saved.updatedAt;
      presence.current?.send({ type: "scene", snapshot: snap });
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
          const remote = await loadBoard();
          const merged = mergeConflictSnapshot(snapshotRef.current, parseSnapshot(remote.snapshot));
          snapshotRef.current = merged;
          signatureRef.current = sceneSignature(merged.elements ?? [], merged.files ?? {});
          revisionRef.current = remote.revision;
          updatedAtRef.current = remote.updatedAt;
          apiRef.current?.updateScene({ elements: merged.elements as never, captureUpdate: "NEVER" });
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
  }, [loadBoard, readOnly, boardId, ownerType]);

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
    const merged = mergeIncomingSnapshot(snapshotRef.current, parsed);
    snapshotRef.current = merged;
    if (dirtyRef.current || savingRef.current) editSequenceRef.current++;
    signatureRef.current = sceneSignature(merged.elements ?? [], merged.files ?? {});
    const fileList = Object.values(merged.files ?? {});
    if (fileList.length) apiRef.current?.addFiles(fileList as never);
    apiRef.current?.updateScene({ elements: merged.elements as never, captureUpdate: "NEVER" });
  }, []);

  const pushPresence = useCallback(() => {
    const collaborators = new Map<string, unknown>();
    for (const [userId, user] of presenceUsers.current) {
      collaborators.set(userId, { id: userId, button: "down", username: user.email, pointer: user.pointer, selectedElements: {}, color: colorForUser(userId) });
    }
    apiRef.current?.updateScene({ appState: { collaborators: collaborators as never }, captureUpdate: "NEVER" });
  }, []);

  useEffect(() => {
    if (!initial || !live) return;
    const connection = createWhiteboardPresence({
      boardId,
      ownerType,
      onScene: applyScene,
      onPresence: (userId, user) => {
        presenceUsers.current.set(userId, user);
        pushPresence();
      },
      onLeave: (userId) => {
        presenceUsers.current.delete(userId);
        pushPresence();
      },
    });
    presence.current = connection;
    connection.start();
    return () => {
      connection.stop();
      if (presence.current === connection) presence.current = null;
    };
  }, [applyScene, pushPresence, initial, boardId, ownerType, live]);

  useEffect(() => {
    const tick = () => {
      if (!document.hidden && !dirtyRef.current && !presence.current?.isOpen()) {
        loadBoard().then((board) => {
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
  }, [loadBoard]);

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
      const sharedFiles = Object.fromEntries(Object.entries(snapshotRef.current.files ?? {}).filter(([, file]) => !file?.dataURL?.startsWith("data:")));
      presence.current?.send({ type: "scene", snapshot: JSON.stringify({ ...EMPTY_SNAPSHOT, elements: snapshotRef.current.elements, appState: {}, files: sharedFiles }) });
    }, BROADCAST_DEBOUNCE_MS);
  }, [persist, readOnly]);

  const handlePointer = useCallback((payload: { pointer?: { x: number; y: number } }) => {
    const pointer = payload?.pointer;
    if (!pointer) return;
    lastPointer.current = { x: pointer.x, y: pointer.y };
    if (presenceTimer.current) return;
    presenceTimer.current = window.setTimeout(() => {
      presenceTimer.current = undefined;
      presence.current?.send({ type: "presence", pointer: lastPointer.current });
    }, 50);
  }, []);

  const setApi = useCallback((api: ExcalidrawImperativeAPI | null) => {
    apiRef.current = api;
  }, []);

  return { initial, error, status, retry: () => setRetry((count) => count + 1), setApi, handleChange, handlePointer };
}
