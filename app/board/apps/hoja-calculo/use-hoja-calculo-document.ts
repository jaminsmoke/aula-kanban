"use client";

import { useCallback, useEffect, useState } from "react";
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
  const { load, save, loading, error } = useAppDocument<SpreadsheetDocument>(projectId, "hoja-calculo");
  const readOnly = role === "guest";

  const applyDocument = useCallback((nextDocument: SpreadsheetDocument, message: string) => {
    setDocumentValue(nextDocument);
    setPendingDocument(nextDocument);
    setDirty(false);
    setStatus(message);
  }, []);

  useEffect(() => {
    let active = true;
    void load().then(({ state }) => {
      if (!active) return;
      const parsed = parseSpreadsheetDocument(state);
      if (parsed) {
        applyDocument(parsed, "Hoja guardada cargada.");
      } else {
        setStatus("Hoja de ejemplo lista. Guarda para conservarla.");
      }
    });
    return () => { active = false; };
  }, [applyDocument, load]);

  const markDirty = useCallback(() => setDirty(true), []);
  const clearPendingDocument = useCallback(() => setPendingDocument(null), []);

  const saveDocument = useCallback(async (nextDocument: SpreadsheetDocument) => {
    if (readOnly) return false;
    setSaving(true);
    const ok = await save(nextDocument);
    setSaving(false);
    if (ok) {
      setDirty(false);
      setStatus("Hoja guardada en el proyecto.");
    } else {
      setStatus("No se pudo guardar la hoja. Revisa la conexión.");
    }
    return ok;
  }, [readOnly, save]);

  const reloadDocument = useCallback(async () => {
    const { state } = await load();
    const parsed = parseSpreadsheetDocument(state);
    if (parsed) {
      applyDocument(parsed, "Hoja guardada cargada.");
    } else {
      setStatus("No hay una hoja guardada válida; se mantiene la actual.");
    }
  }, [applyDocument, load]);

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
