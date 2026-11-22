"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LoadedDocument, VersionedSaveResult } from "../shared/versioned-document";
import { saveVersionedDocument } from "../shared/versioned-document";

export type { LoadedDocument, VersionedSaveResult } from "../shared/versioned-document";

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
  const versionRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
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
      versionRef.current = next.updatedAt;
      if (mounted.current) { setUpdatedAt(next.updatedAt); setLoadFailed(false); setError(null); }
      return next;
    } catch {
      if (mounted.current) { setLoadFailed(true); setError("No se pudo cargar el documento guardado."); }
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
    const result = await saveVersionedDocument(endpoint, state, expectedUpdatedAt);
    if (mounted.current) {
      if (result.status === "saved") {
        setUpdatedAt(result.updatedAt);
        setError(null);
      } else if (result.status === "conflict") {
        setError("El documento ha cambiado en otra sesión.");
      } else {
        setError("No se pudo guardar el documento.");
      }
    }
    return result;
  }, [endpoint]);

  const markLoadFailed = useCallback(() => setLoadFailed(true), []);

  /**
   * Guarda con la última versión cargada y bloquea si la carga falló.
   * @param state - Estado completo que se quiere persistir.
   * @returns El resultado del guardado, el conflicto o el fallo.
   */
  const saveCurrentVersioned = useCallback(async (state: T): Promise<VersionedSaveResult> => {
    if (loadFailed) return { status: "failed" };
    const result = await saveVersioned(state, versionRef.current);
    if (result.status === "saved") versionRef.current = result.updatedAt;
    return result;
  }, [loadFailed, saveVersioned]);

  return {
    load,
    save,
    saveVersioned,
    saveCurrentVersioned,
    loading,
    updatedAt,
    loadFailed,
    markLoadFailed,
    error,
  };
}
