"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Resumen de un documento de la suite. */
export type AulaDocumentSummary = {
  id: string;
  projectId: string;
  title: string;
  excerpt: string;
  status: "active" | "archived" | "deleted";
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
  createdBy: string | null;
  updatedBy: string | null;
};

/** Lista agrupada de documentos. */
export type AulaDocumentSuite = {
  active: AulaDocumentSummary[];
  archived: AulaDocumentSummary[];
  deleted: AulaDocumentSummary[];
};

const EMPTY_SUITE: AulaDocumentSuite = { active: [], archived: [], deleted: [] };
const LAST_OPENED_PREFIX = "aula-kanban:aula-documentos:last-opened:";

/**
 * Lee el último documento abierto de un proyecto.
 * @param projectId - Proyecto activo.
 * @returns El id guardado o `null`.
 */
function readLastOpened(projectId: string): string | null {
  try {
    return window.localStorage.getItem(`${LAST_OPENED_PREFIX}${projectId}`);
  } catch {
    return null;
  }
}

/**
 * Guarda el último documento abierto.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento abierto.
 */
function writeLastOpened(projectId: string, documentId: string) {
  try {
    window.localStorage.setItem(`${LAST_OPENED_PREFIX}${projectId}`, documentId);
  } catch {
    // La preferencia es opcional; el fallo de cuota no debe bloquear la app.
  }
}

/**
 * Lee el documento que llega en la URL del tablero.
 * @returns El id o `null`.
 */
function readUrlDocumentId(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("doc");
  } catch {
    return null;
  }
}

/**
 * Refleja el documento activo en la URL sin recargar.
 * @param documentId - Documento activo o `null`.
 * @param push - Si se añade una entrada al historial.
 */
function writeUrlDocumentId(documentId: string | null, push = false) {
  try {
    const url = new URL(window.location.href);
    if (documentId) url.searchParams.set("doc", documentId);
    else url.searchParams.delete("doc");
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (push) window.history.pushState(null, "", next);
    else window.history.replaceState(null, "", next);
  } catch {
    // La URL es una mejora progresiva; no debe romper la edición.
  }
}

/**
 * Gestiona la lista, el documento activo y el ciclo de vida de la suite.
 * @param projectId - Proyecto activo.
 * @returns Estado y acciones de la suite.
 */
export function useAulaDocumentSuite(projectId: string) {
  const base = `/api/aula-documentos?project=${encodeURIComponent(projectId)}`;
  const [suite, setSuite] = useState<AulaDocumentSuite>(EMPTY_SUITE);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const autoCreated = useRef(false);
  const initializingRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  /**
   * Crea un documento vacío cuando el proyecto aún no tiene nada.
   * @returns El documento creado o `null`.
   */
  const createInitialDocument = useCallback(async (): Promise<AulaDocumentSummary | null> => {
    try {
      const response = await fetch(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!response.ok) return null;
      const data = await response.json() as { document?: AulaDocumentSummary };
      return data.document ?? null;
    } catch {
      return null;
    }
  }, [base]);

  /**
   * Carga la lista y conserva el documento activo si sigue disponible.
   * @param preferredId - Documento que se intenta conservar.
   * @returns La lista cargada o `null` si falló.
   */
  const refresh = useCallback(async (preferredId?: string | null): Promise<AulaDocumentSuite | null> => {
    setLoading(true);
    try {
      const response = await fetch(base, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as Partial<AulaDocumentSuite>;
      const next: AulaDocumentSuite = {
        active: data.active ?? [],
        archived: data.archived ?? [],
        deleted: data.deleted ?? [],
      };
      if (!mounted.current) return next;
      setSuite(next);
      setError(null);
      setDocumentId((current) => {
        const wanted = preferredId ?? current;
        const candidate = wanted && next.active.some((document) => document.id === wanted)
          ? wanted
          : next.active[0]?.id ?? null;
        if (candidate) writeLastOpened(projectId, candidate);
        writeUrlDocumentId(candidate);
        return candidate;
      });
      return next;
    } catch {
      if (mounted.current) setError("No se pudieron cargar los documentos del proyecto.");
      return null;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [base, projectId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const urlId = readUrlDocumentId();
      const loaded = await refresh(urlId ?? readLastOpened(projectId));
      if (!active || !mounted.current || loaded === null) return;
      if (urlId && !loaded.active.some((document) => document.id === urlId)) {
        setError("El documento del enlace no está disponible en este proyecto.");
      }
      if (loaded.active.length === 0 && loaded.archived.length === 0 && loaded.deleted.length === 0 && !autoCreated.current) {
        autoCreated.current = true;
        initializingRef.current = true;
        setInitializing(true);
        try {
          const created = await createInitialDocument();
          if (!active || !mounted.current) return;
          if (created) {
            setSuite({ active: [created], archived: [], deleted: [] });
            setDocumentId(created.id);
            writeLastOpened(projectId, created.id);
            writeUrlDocumentId(created.id);
            setError(null);
          } else {
            setError("No se pudo preparar el primer documento.");
          }
        } finally {
          if (mounted.current) {
            initializingRef.current = false;
            setInitializing(false);
          }
        }
      }
    })();
    return () => { active = false; };
  }, [createInitialDocument, projectId, refresh]);

  const selectDocument = useCallback((id: string) => {
    setDocumentId(id);
    writeLastOpened(projectId, id);
    writeUrlDocumentId(id, true);
  }, [projectId]);

  const createDocument = useCallback(async (state?: unknown, title?: string): Promise<AulaDocumentSummary | null> => {
    if (initializingRef.current) return null;
    try {
      const response = await fetch(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(title ? { title } : {}), ...(state === undefined ? {} : { state }) }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json() as { document?: AulaDocumentSummary };
      if (!data.document) throw new Error();
      await refresh(data.document.id);
      return data.document;
    } catch {
      if (mounted.current) setError("No se pudo crear el documento.");
      return null;
    }
  }, [base, refresh]);

  const runAction = useCallback(async (
    id: string,
    body: Record<string, unknown>,
  ): Promise<{ document?: AulaDocumentSummary } | null> => {
    try {
      const response = await fetch(`/api/aula-documentos/${encodeURIComponent(id)}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error();
      const data = await response.json() as { document?: AulaDocumentSummary };
      await refresh(data.document?.status === "active" ? data.document.id : undefined);
      return data;
    } catch {
      if (mounted.current) setError("No se pudo actualizar el documento.");
      return null;
    }
  }, [refresh]);

  const duplicateDocument = useCallback(async (id: string) => {
    const result = await runAction(id, { action: "duplicate" });
    if (result?.document) selectDocument(result.document.id);
    return result?.document ?? null;
  }, [runAction, selectDocument]);

  const renameDocument = useCallback(async (id: string, title: string) => {
    const result = await runAction(id, { action: "rename", title });
    if (result?.document && id === documentId) setSuite((current) => ({
      ...current,
      active: current.active.map((document) => document.id === id ? result.document as AulaDocumentSummary : document),
    }));
    return result?.document ?? null;
  }, [documentId, runAction]);

  const archiveDocument = useCallback(async (id: string) => {
    await runAction(id, { action: "archive" });
  }, [runAction]);

  const deleteDocument = useCallback(async (id: string) => {
    await runAction(id, { action: "delete" });
  }, [runAction]);

  const restoreDocument = useCallback(async (id: string) => {
    await runAction(id, { action: "restore" });
  }, [runAction]);

  return {
    suite,
    documentId,
    loading,
    initializing,
    error,
    refresh,
    selectDocument,
    createDocument,
    duplicateDocument,
    renameDocument,
    archiveDocument,
    deleteDocument,
    restoreDocument,
  };
}
