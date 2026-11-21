"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { StoreRole } from "../../types";
import type {
  AulaDocumentVersion,
  AulaDocumentVersionDetail,
} from "../../../../../lib/domain/aula-documentos/revision";
import { parseAulaDocument, type AulaDocument } from "../../../../../lib/domain/aula-documentos/document";

type VersionHistoryDeps = {
  projectId: string;
  documentId: string | null;
  role: StoreRole;
  documentVersionRef: MutableRefObject<number | null>;
  setLastSavedAt: (timestamp: number | null) => void;
  applyDocument: (document: AulaDocument) => void;
  setStatus: (message: string) => void;
};

/** Respuesta de historial. */
type VersionsResponse = {
  versions?: AulaDocumentVersion[];
  version?: AulaDocumentVersionDetail;
  total?: number;
  document?: unknown;
  updatedAt?: number;
  message?: string;
};

/** Previsualización de una versión. */
export type AulaVersionPreview = {
  version: AulaDocumentVersion;
  document: AulaDocument;
};

/**
 * Gestiona el historial de versiones del documento activo.
 * @param deps - Documento, rol y actualizadores compartidos.
 * @returns Estado, historial y acciones de versión.
 */
export function useAulaVersions({
  projectId,
  documentId,
  role,
  documentVersionRef,
  setLastSavedAt,
  applyDocument,
  setStatus,
}: VersionHistoryDeps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<AulaDocumentVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AulaVersionPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previousDocumentId = useRef(documentId);
  const canManageHistory = role === "owner" || role === "admin" || role === "teacher";
  const basePath = documentId
    ? `/api/aula-documentos/${encodeURIComponent(documentId)}/versions`
    : null;
  const endpoint = basePath
    ? `${basePath}?project=${encodeURIComponent(projectId)}`
    : null;

  useEffect(() => {
    if (previousDocumentId.current === documentId) return;
    previousDocumentId.current = documentId;
    queueMicrotask(() => {
      setHistoryOpen(false);
      setVersions([]);
      setTotal(0);
      setPreview(null);
    });
  }, [documentId]);

  const refresh = useCallback(async () => {
    if (!endpoint || !canManageHistory) {
      setVersions([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as VersionsResponse;
      setVersions(data.versions ?? []);
      setTotal(data.total ?? 0);
      setError(null);
    } catch {
      setError("No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }, [canManageHistory, endpoint]);

  const openHistory = useCallback(() => {
    if (!canManageHistory) return;
    setHistoryOpen(true);
    void refresh();
  }, [canManageHistory, refresh]);

  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
    setPreview(null);
  }, []);

  const createVersion = useCallback(async (name: string) => {
    if (!endpoint || !canManageHistory) return false;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as VersionsResponse;
        setStatus(data.message ?? "No se pudo crear la versión.");
        return false;
      }
      await refresh();
      setStatus("Versión guardada.");
      return true;
    } catch {
      setStatus("No se pudo crear la versión.");
      return false;
    }
  }, [canManageHistory, endpoint, refresh, setStatus]);

  const previewVersion = useCallback(async (version: AulaDocumentVersion) => {
    if (!basePath || !canManageHistory) return;
    setPreviewLoading(true);
    try {
      const response = await fetch(`${basePath}/${encodeURIComponent(version.id)}?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as VersionsResponse;
      const parsed = parseAulaDocument(data.version?.state);
      if (!parsed.ok) throw new Error();
      setPreview({ version, document: parsed.document });
    } catch {
      setStatus("No se pudo previsualizar la versión.");
    } finally {
      setPreviewLoading(false);
    }
  }, [basePath, canManageHistory, projectId, setStatus]);

  const restoreVersion = useCallback(async (version: AulaDocumentVersion) => {
    if (!basePath || !canManageHistory) return false;
    const expectedUpdatedAt = documentVersionRef.current;
    if (expectedUpdatedAt === null) {
      setStatus("Guarda el documento antes de restaurar una versión.");
      return false;
    }
    try {
      const response = await fetch(`${basePath}/${encodeURIComponent(version.id)}/restore?project=${encodeURIComponent(projectId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as VersionsResponse;
        setStatus(data.message ?? "No se pudo restaurar la versión.");
        return false;
      }
      const data = await response.json() as VersionsResponse;
      const parsed = parseAulaDocument(data.document);
      if (!parsed.ok || typeof data.updatedAt !== "number") throw new Error();
      applyDocument(parsed.document);
      documentVersionRef.current = data.updatedAt;
      setLastSavedAt(data.updatedAt);
      setPreview(null);
      await refresh();
      setStatus("Versión restaurada.");
      return true;
    } catch {
      setStatus("No se pudo restaurar la versión.");
      return false;
    }
  }, [applyDocument, basePath, canManageHistory, documentVersionRef, projectId, refresh, setLastSavedAt, setStatus]);

  return {
    historyOpen,
    versions,
    versionCount: total,
    versionsLoading: loading,
    versionsError: error,
    versionPreview: preview,
    versionPreviewLoading: previewLoading,
    canManageHistory,
    openHistory,
    closeHistory,
    createVersion,
    previewVersion,
    restoreVersion,
    clearVersionPreview: () => setPreview(null),
  };
}
