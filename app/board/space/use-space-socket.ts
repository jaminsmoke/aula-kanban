"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AccionVentana, ComandoVentana, VentanaEstado } from "../../../lib/domain/space-windows";

const ACCIONES: readonly AccionVentana[] = ["abrir", "cerrar", "minimizar", "restaurar", "ampliar"];

/**
 * Conecta el escritorio de Mi espacio con la sala en vivo del proyecto
 * (`/api/space-socket`, Fase 2 de MCP-04): la pestaña publica el estado de
 * sus ventanas y ejecuta los comandos que envían las herramientas MCP
 * (abrir/cerrar/minimizar/restaurar/ampliar ventanas de la cuenta dueña del
 * socket). Sin conexión, el escritorio sigue funcionando con el enlace
 * profundo de la fase anterior.
 * @param projectId - Proyecto de la sala.
 * @returns Publicar el estado y registrar qué hacer con cada comando.
 */
export function useSpaceSocket(projectId: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(new Set<(cmd: ComandoVentana) => void>());

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/space-socket?project=${encodeURIComponent(projectId)}`);
    socketRef.current = socket;
    const onMessage = (event: MessageEvent) => {
      let data: ComandoVentana;
      try {
        data = JSON.parse(event.data as string) as ComandoVentana;
      } catch {
        return;
      }
      if (data?.type !== "comando" || typeof data.appId !== "string" || !ACCIONES.includes(data.accion)) return;
      handlersRef.current.forEach((handler) => handler(data));
    };
    socket.addEventListener("message", onMessage);
    return () => {
      socket.removeEventListener("message", onMessage);
      socket.close();
      socketRef.current = null;
    };
  }, [projectId]);

  const publicarEstado = useCallback((ventanas: VentanaEstado[]) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify({ type: "estado", ventanas }));
    }
  }, []);

  const alComando = useCallback((handler: (cmd: ComandoVentana) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return { publicarEstado, alComando };
}
