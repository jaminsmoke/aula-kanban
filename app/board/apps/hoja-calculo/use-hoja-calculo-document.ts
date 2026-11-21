"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreRole } from "../types";
import { useAppDocument } from "../use-app-document";
import {
  STARTER_SHEET,
  cloneSheet,
  parseSpreadsheetDocument,
  type SpreadsheetDocument,
} from "./hoja-calculo-model";

/**
 * Estado persistente y acciones de documento de la hoja de cálculo.
 * @param projectId - Proyecto activo.
 * @param role - Rol del usuario.
 * @returns Documento, estado de guardado y acciones de carga/guardado.
 */
export function useHojaCalculoDocument(projectId: string, role: StoreRole) {
  const [documentValue, setDocumentValue] = useState<SpreadsheetDocument>(() => ({ data: cloneSheet(STARTER_SHEET) }));
  const [pendingDocument, setPendingDocument] = useState<SpreadsheetDocument | null>(null);
  const [status, setStatus] = useState("Hoja de ejemplo lista.");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const versionRef = useRef<number | null>(null);
  const { load, saveVersioned, loading, error } = useAppDocument<SpreadsheetDocument>(projectId, "hoja-calculo");
  const readOnly = role === "guest";

  const applyDocument = useCallback((nextDocument: SpreadsheetDocument, message: string) => {
    setDocumentValue(nextDocument);
    setPendingDocument(nextDocument);
    setDirty(false);
    setStatus(message);
  }, []);

  useEffect(() => {
    let active = true;
    void load().then(({ state, updatedAt, ok }) => {
      if (!active) return;
      if (ok === false) {
        setLoadFailed(true);
        setStatus("No se pudo cargar la hoja guardada. Se conserva la hoja actual.");
        return;
      }
      const parsed = parseSpreadsheetDocument(state);
      if (parsed) {
        versionRef.current = updatedAt;
        setLoadFailed(false);
        applyDocument(parsed, "Hoja guardada cargada.");
      } else if (state === null) {
        versionRef.current = null;
        setLoadFailed(false);
        setStatus("Hoja de ejemplo lista. Guarda para conservarla.");
      } else {
        setLoadFailed(true);
        setStatus("La hoja guardada no es válida. Se conserva la hoja actual.");
      }
    });
    return () => { active = false; };
  }, [applyDocument, load]);

  const markDirty = useCallback(() => setDirty(true), []);
  const clearPendingDocument = useCallback(() => setPendingDocument(null), []);

  const saveDocument = useCallback(async (nextDocument: SpreadsheetDocument) => {
    if (readOnly) return false;
    if (loadFailed) {
      setStatus("No se puede guardar hasta recuperar la hoja guardada.");
      return false;
    }
    setSaving(true);
    const result = await saveVersioned(nextDocument, versionRef.current);
    setSaving(false);
    if (result.status === "saved") {
      versionRef.current = result.updatedAt;
      setDirty(false);
      setStatus("Hoja guardada en el proyecto.");
      return true;
    }
    if (result.status === "conflict") {
      setDirty(true);
      setStatus("La hoja ha cambiado en otra sesión. Tus cambios siguen aquí; usa Cargar para revisar la versión guardada.");
      return false;
    }
    setStatus("No se pudo guardar la hoja. Revisa la conexión.");
    return false;
  }, [loadFailed, readOnly, saveVersioned]);

  const reloadDocument = useCallback(async () => {
    if (dirty && typeof window !== "undefined" && !window.confirm(
      "Hay cambios sin guardar. ¿Cargar la versión guardada y descartar los cambios locales?",
    )) {
      return;
    }
    const { state, updatedAt, ok } = await load();
    if (ok === false) {
      setLoadFailed(true);
      setStatus("No se pudo cargar la hoja guardada. Se conserva la hoja actual.");
      return;
    }
    const parsed = parseSpreadsheetDocument(state);
    if (parsed) {
      versionRef.current = updatedAt;
      setLoadFailed(false);
      applyDocument(parsed, "Hoja guardada cargada.");
      return;
    }
    if (state === null) {
      versionRef.current = null;
      setLoadFailed(false);
      setStatus("No hay una hoja guardada; se mantiene la hoja actual.");
      return;
    }
    setLoadFailed(true);
    setStatus("La hoja guardada no es válida; se mantiene la hoja actual.");
  }, [applyDocument, dirty, load]);

  return {
    documentValue,
    setDocumentValue,
    pendingDocument,
    clearPendingDocument,
    status,
    setStatus,
    dirty,
    markDirty,
    saving,
    loading,
    error,
    readOnly,
    saveDocument,
    reloadDocument,
  };
}
