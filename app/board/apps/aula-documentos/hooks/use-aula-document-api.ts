"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LoadedDocument, VersionedSaveResult } from "../../../shared/versioned-document";
import { saveVersionedDocument } from "../../../shared/versioned-document";

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
    const result = await saveVersionedDocument(endpoint, state, expectedUpdatedAt);
    if (mounted.current) {
      if (result.status === "saved") setError(null);
      else if (result.status === "conflict") setError("El documento ha cambiado en otra sesión.");
      else setError("No se pudo guardar el documento.");
    }
    return result;
  }, [endpoint]);

  return { load, saveVersioned, loading, error };
}
