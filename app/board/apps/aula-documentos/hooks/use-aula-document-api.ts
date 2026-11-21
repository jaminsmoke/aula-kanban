"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LoadedDocument, VersionedSaveResult } from "../../../shared/versioned-document";

export type { VersionedSaveResult } from "../../../shared/versioned-document";

/** Resultado de leer un documento de la suite. */
export type LoadedAulaDocument = LoadedDocument<unknown>;

/** Resultado de un guardado con comprobación de versión. */
export type AulaDocumentSaveResult = VersionedSaveResult;

/**
 * Persistencia de un documento concreto de la suite de Aula.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento seleccionado o `null` mientras carga la lista.
 * @returns Acciones de carga/guardado y su estado.
 */
export function useAulaDocumentApi(projectId: string, documentId: string | null) {
  const endpoint = documentId
    ? `/api/aula-documentos/${encodeURIComponent(documentId)}?project=${encodeURIComponent(projectId)}`
    : null;
  const mounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async (): Promise<LoadedAulaDocument> => {
    if (!endpoint) return { state: null, updatedAt: null, ok: false };
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { document?: { state?: unknown; updatedAt?: number } };
      const next = {
        state: data.document?.state ?? null,
        updatedAt: typeof data.document?.updatedAt === "number" ? data.document.updatedAt : null,
        ok: true,
      };
      if (mounted.current) setError(null);
      return next;
    } catch {
      if (mounted.current) setError("No se pudo cargar el documento guardado.");
      return { state: null, updatedAt: null, ok: false };
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [endpoint]);

  const saveVersioned = useCallback(async (state: unknown, expectedUpdatedAt: number | null): Promise<AulaDocumentSaveResult> => {
    if (!endpoint) return { status: "failed" };
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
      if (mounted.current) setError(null);
      return { status: "saved", updatedAt: next };
    } catch {
      if (mounted.current) setError("No se pudo guardar el documento.");
      return { status: "failed" };
    }
  }, [endpoint]);

  return { load, saveVersioned, loading, error };
}
