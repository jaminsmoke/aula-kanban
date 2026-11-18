"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Resultado de leer el documento de una app. */
export type LoadedDocument<T> = { state: T | null; updatedAt: number | null; ok?: boolean };

/** Resultado de un guardado con comprobación de versión. */
export type VersionedSaveResult =
  | { status: "saved"; updatedAt: number }
  | { status: "conflict"; updatedAt: number | null }
  | { status: "failed" };

/**
 * Persistencia común de las apps nativas: lee y guarda un estado JSON por
 * proyecto y app en `/api/app-documents`.
 * @param projectId - Proyecto activo.
 * @param appId - Identificador de la app.
 * @returns Acciones de carga/guardado y su estado.
 */
export function useAppDocument<T>(projectId: string, appId: string) {
  const endpoint = `/api/app-documents?project=${encodeURIComponent(projectId)}&app=${encodeURIComponent(appId)}`;
  const mounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async (): Promise<LoadedDocument<T>> => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { state?: T | null; updatedAt?: number | null };
      const next = { state: data.state ?? null, updatedAt: data.updatedAt ?? null, ok: true };
      if (mounted.current) { setUpdatedAt(next.updatedAt); setError(null); }
      return next;
    } catch {
      if (mounted.current) setError("No se pudo cargar el documento guardado.");
      return { state: null, updatedAt: null, ok: false };
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [endpoint]);

  const save = useCallback(async (state: T): Promise<boolean> => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json() as { updatedAt?: number };
      if (mounted.current) { setUpdatedAt(data.updatedAt ?? Date.now()); setError(null); }
      return true;
    } catch {
      if (mounted.current) setError("No se pudo guardar el documento.");
      return false;
    }
  }, [endpoint]);

  /**
   * Guarda el estado solo si la versión del servidor sigue siendo la esperada.
   * @param state - Estado completo que se quiere persistir.
   * @param expectedUpdatedAt - Versión conocida o `null` si el documento es nuevo.
   * @returns El resultado del guardado, el conflicto o el fallo de red.
   */
  const saveVersioned = useCallback(async (state: T, expectedUpdatedAt: number | null): Promise<VersionedSaveResult> => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state, expectedUpdatedAt }),
      });
      if (response.status === 409) {
        let current: number | null = null;
        try {
          const data = await response.json() as { updatedAt?: number | null };
          if (typeof data.updatedAt === "number") current = data.updatedAt;
        } catch {
          current = null;
        }
        if (mounted.current) setError("El documento ha cambiado en otra sesión.");
        return { status: "conflict", updatedAt: current };
      }
      if (!response.ok) throw new Error();
      const data = await response.json() as { updatedAt?: number };
      const next = typeof data.updatedAt === "number" ? data.updatedAt : Date.now();
      if (mounted.current) { setUpdatedAt(next); setError(null); }
      return { status: "saved", updatedAt: next };
    } catch {
      if (mounted.current) setError("No se pudo guardar el documento.");
      return { status: "failed" };
    }
  }, [endpoint]);

  return { load, save, saveVersioned, loading, updatedAt, error };
}
