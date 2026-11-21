import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Editor } from "@tiptap/core";
import {
  createEmptyAulaDocument,
  parseAulaDocument,
  type AulaDocument,
} from "../../../../../lib/domain/aula-documentos/document";
import { aulaRecoveryFileName } from "../../../../../lib/domain/aula-documentos/filename";
import type { AulaRecoveryReason } from "../../../../../lib/domain/aula-documentos/recovery";
import { useWindowClose, useWindowCloseGuard } from "../../../shared/window-close-guard";
import { useDialogFocus } from "../../../shared/use-dialog-focus";
import { matchesAulaShortcut } from "../../../shared/aula-documentos/shortcuts";
import { useAulaDocumentApi, type VersionedSaveResult } from "./use-aula-document-api";
import { AUTOSAVE_DELAY_MS, type SaveConflict } from "../aula-documentos-types";
import { downloadTextFile } from "../../../shared/ui/download";

type PersistenceDeps = {
  projectId: string;
  documentId: string | null;
  readOnly: boolean;
  title: string;
  setTitle: (title: string) => void;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  saveFailed: boolean;
  setSaveFailed: (failed: boolean) => void;
  setLastSavedAt: (timestamp: number | null) => void;
  editVersion: number;
  setStatus: (message: string) => void;
  editor: Editor | null;
  currentDocument: () => AulaDocument | null;
  applyDocument: (document: AulaDocument) => void;
  markChanged: (message?: string) => void;
  storeRecoveryCopy: (reason: AulaRecoveryReason, serverUpdatedAt?: number | null) => boolean;
  documentVersionRef: MutableRefObject<number | null>;
  editVersionRef: MutableRefObject<number>;
  savingRef: MutableRefObject<boolean>;
  mountedRef: MutableRefObject<boolean>;
};

/**
 * Carga, guarda y resuelve conflictos del documento con el servidor.
 * @param deps - Documento actual, estado de guardado y referencias compartidas.
 * @returns Estado y acciones de persistencia.
 */
export function useAulaPersistence({
  projectId,
  documentId,
  readOnly,
  title,
  setTitle,
  dirty,
  setDirty,
  saving,
  setSaving,
  saveFailed,
  setSaveFailed,
  setLastSavedAt,
  editVersion,
  setStatus,
  editor,
  currentDocument,
  applyDocument,
  markChanged,
  storeRecoveryCopy,
  documentVersionRef,
  editVersionRef,
  savingRef,
  mountedRef,
}: PersistenceDeps) {
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [invalidDocument, setInvalidDocument] = useState<{ raw: unknown; message: string } | null>(null);
  const [invalidResetConfirm, setInvalidResetConfirm] = useState(false);
  const [saveConflict, setSaveConflict] = useState<SaveConflict | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const invalidDocumentRef = useRef<HTMLElement>(null);
  const closePromptRef = useRef<HTMLElement>(null);
  const conflictRef = useRef<HTMLElement>(null);
  const { load, saveVersioned, loading, error } = useAulaDocumentApi(projectId, documentId);
  const requestWindowClose = useWindowClose();

  useDialogFocus(Boolean(invalidDocument), () => {}, invalidDocumentRef);
  useDialogFocus(closePromptOpen, () => setClosePromptOpen(false), closePromptRef);
  useDialogFocus(Boolean(saveConflict), () => {}, conflictRef);

  const closeGuard = useCallback(() => {
    if (readOnly) return true;
    if (saveConflict) return false;
    if (!dirty) return true;
    setClosePromptOpen(true);
    return false;
  }, [dirty, readOnly, saveConflict]);
  useWindowCloseGuard(closeGuard);

  /**
   * Descarga el JSON original de un documento que no se pudo validar.
   */
  function downloadInvalidDocument() {
    if (!invalidDocument) return;
    try {
      downloadTextFile(
        JSON.stringify(invalidDocument.raw, null, 2),
        "application/json;charset=utf-8",
        aulaRecoveryFileName(title),
      );
      setStatus("JSON original descargado.");
    } catch {
      setStatus("No se pudo descargar el JSON original.");
    }
  }

  /**
   * Sustituye un documento inválido por un documento vacío, con confirmación.
   */
  function resetInvalidDocument() {
    applyDocument(createEmptyAulaDocument("Documento sin título"));
    setInvalidDocument(null);
    setInvalidResetConfirm(false);
    setLastSavedAt(null);
    markChanged("Documento reiniciado. Guárdalo para conservarlo.");
  }

  /**
   * Cierra la ventana sin guardar los cambios pendientes.
   */
  function closeWithoutSaving() {
    setClosePromptOpen(false);
    requestWindowClose();
  }

  const applyLoadedState = useCallback((state: unknown, updatedAt: number | null) => {
    documentVersionRef.current = typeof updatedAt === "number" ? updatedAt : null;
    if (state === null) {
      setInvalidDocument(null);
      setLastSavedAt(null);
      setStatus("Documento de ejemplo listo. Guarda para conservarlo.");
      return;
    }
    const parsed = parseAulaDocument(state);
    if (parsed.ok) {
      setInvalidDocument(null);
      setLastSavedAt(typeof updatedAt === "number" ? updatedAt : null);
      applyDocument(parsed.document);
    } else {
      setInvalidDocument({ raw: state, message: parsed.message });
      setInvalidResetConfirm(false);
      setLastSavedAt(null);
      setStatus("El documento guardado no se pudo leer.");
    }
  }, [applyDocument, documentVersionRef, setLastSavedAt, setStatus]);

  async function loadSavedDocument() {
    const { state, updatedAt } = await load();
    if (!mountedRef.current) return;
    applyLoadedState(state, updatedAt);
  }

  /**
   * Persiste un documento y actualiza el estado de guardado.
   * @param document - Documento validado.
   * @param automatic - Indica si el guardado lo inició el autosave.
   * @returns `true` si se guardó correctamente.
   */
  const persistDocument = useCallback(async (document: AulaDocument, automatic: boolean): Promise<boolean> => {
    if (saveConflict || savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);
    setStatus(automatic ? "Guardando automáticamente…" : "Guardando documento…");
    const versionAtSave = editVersionRef.current;
    let result: VersionedSaveResult;
    try {
      result = await saveVersioned(document, documentVersionRef.current);
    } catch {
      result = { status: "failed" };
    }
    savingRef.current = false;
    if (!mountedRef.current) return result.status === "saved";
    setSaving(false);
    if (result.status === "saved") {
      documentVersionRef.current = result.updatedAt;
      setLastSavedAt(result.updatedAt);
      if (editVersionRef.current === versionAtSave) {
        setTitle(document.title);
        setDirty(false);
      }
      setStatus(automatic ? "Documento guardado automáticamente." : "Documento guardado en el proyecto.");
      return true;
    }
    if (result.status === "conflict") {
      setSaveConflict({ updatedAt: result.updatedAt, keepConfirm: false });
      setConflictNotice(null);
      setSaveFailed(false);
      setDirty(true);
      setStatus("El documento cambió en otra sesión. Elige qué versión conservar.");
      return false;
    }
    setSaveFailed(true);
    setDirty(true);
    setStatus("No se pudo guardar el documento. Revisa la conexión.");
    return false;
  }, [documentVersionRef, editVersionRef, mountedRef, saveConflict, saveVersioned, savingRef, setDirty, setLastSavedAt, setSaveFailed, setSaving, setStatus, setTitle]);

  /**
   * Construye y persiste el documento actual.
   * @param automatic - Indica si el guardado lo inició el autosave.
   * @returns `true` si se guardó correctamente.
   */
  const saveCurrent = useCallback(async (automatic: boolean): Promise<boolean> => {
    if (readOnly) return false;
    const document = currentDocument();
    if (!document) return false;
    return persistDocument(document, automatic);
  }, [currentDocument, persistDocument, readOnly]);

  /**
   * Guarda y cierra la ventana si el guardado termina bien.
   */
  async function saveAndClose() {
    const ok = await saveCurrent(false);
    if (!ok) return;
    setClosePromptOpen(false);
    requestWindowClose();
  }

  /**
   * Descarga una copia de la versión local antes de resolver el conflicto.
   * @returns `true` si la copia se generó correctamente.
   */
  function downloadConflictCopy(): boolean {
    const document = currentDocument();
    if (!document) {
      setConflictNotice("No se pudo preparar la copia porque el documento no es válido.");
      return false;
    }
    try {
      downloadTextFile(
        JSON.stringify(document, null, 2),
        "application/json;charset=utf-8",
        aulaRecoveryFileName(document.title),
      );
      setConflictNotice("Copia de tu versión descargada.");
      setStatus("Copia de la versión en conflicto descargada.");
      return true;
    } catch {
      setConflictNotice("No se pudo descargar la copia. Revisa los permisos del navegador.");
      setStatus("No se pudo descargar la copia de la versión en conflicto.");
      return false;
    }
  }

  /**
   * Recarga la versión del servidor y descarta la copia local del editor.
   */
  async function reloadServerVersion() {
    if (!saveConflict || savingRef.current) return;
    const stored = storeRecoveryCopy("conflict", saveConflict.updatedAt);
    if (!stored && !downloadConflictCopy()) {
      setConflictNotice("No se pudo guardar ni descargar una copia. La versión del servidor no se ha recargado.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setConflictNotice("Recargando la versión del servidor…");
    const loaded = await load();
    savingRef.current = false;
    if (!mountedRef.current) return;
    setSaving(false);
    if (loaded.ok === false) {
      setConflictNotice("No se pudo recargar. Revisa la conexión e inténtalo de nuevo.");
      setStatus("No se pudo recargar la versión del servidor.");
      return;
    }
    applyLoadedState(loaded.state, loaded.updatedAt);
    setSaveConflict(null);
    setConflictNotice(null);
    setSaveFailed(false);
    setStatus("Versión del servidor recargada.");
  }

  /**
   * Descarga una copia y sobrescribe la versión del servidor con la local.
   */
  async function keepMineVersion() {
    if (!saveConflict || savingRef.current) return;
    const document = currentDocument();
    if (!document) {
      setConflictNotice("No se pudo preparar el documento para conservarlo.");
      return;
    }
    if (!downloadConflictCopy()) return;
    storeRecoveryCopy("conflict", saveConflict.updatedAt);

    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);
    setConflictNotice("Guardando tu versión sobre la del servidor…");
    const versionAtSave = editVersionRef.current;
    let result: VersionedSaveResult;
    try {
      result = await saveVersioned(document, saveConflict.updatedAt);
    } catch {
      result = { status: "failed" };
    }
    savingRef.current = false;
    if (!mountedRef.current) return;
    setSaving(false);

    if (result.status === "saved") {
      documentVersionRef.current = result.updatedAt;
      setLastSavedAt(result.updatedAt);
      if (editVersionRef.current === versionAtSave) {
        setTitle(document.title);
        setDirty(false);
      }
      setSaveConflict(null);
      setConflictNotice(null);
      setStatus("Tu versión se guardó y la copia quedó descargada.");
      return;
    }
    if (result.status === "conflict") {
      setSaveConflict({ updatedAt: result.updatedAt, keepConfirm: false });
      setConflictNotice("La versión del servidor volvió a cambiar. Descarga otra copia antes de reintentar.");
      setSaveFailed(false);
      setDirty(true);
      setStatus("La versión del servidor volvió a cambiar.");
      return;
    }
    setSaveFailed(true);
    setDirty(true);
    setConflictNotice("No se pudo guardar tu versión. La copia descargada sigue disponible.");
    setStatus("No se pudo conservar tu versión. Revisa la conexión.");
  }

  useEffect(() => {
    if (readOnly || loading || !editor || !dirty || saving || saveFailed || invalidDocument || saveConflict) return;
    const timer = window.setTimeout(() => { void saveCurrent(true); }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [dirty, editVersion, editor, invalidDocument, loading, readOnly, saveConflict, saveCurrent, saveFailed, saving]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const app = document.querySelector(".aula-documentos-app");
      if (!app || !(event.target instanceof Node) || !app.contains(event.target)) return;
      if (matchesAulaShortcut(event, "save")) {
        event.preventDefault();
        void saveCurrent(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveCurrent]);

  useEffect(() => {
    if (readOnly || !dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, readOnly]);

  useEffect(() => {
    let active = true;
    void load().then(({ state, updatedAt }) => {
      if (!active || !mountedRef.current) return;
      applyLoadedState(state, updatedAt);
    });
    return () => { active = false; };
  }, [applyLoadedState, load, mountedRef]);

  useEffect(() => {
    editor?.setEditable(!readOnly && !invalidDocument);
  }, [editor, invalidDocument, readOnly]);

  return {
    loading,
    error,
    closePromptOpen,
    setClosePromptOpen,
    invalidDocument,
    invalidDocumentRef,
    invalidResetConfirm,
    setInvalidResetConfirm,
    saveConflict,
    setSaveConflict,
    conflictNotice,
    setConflictNotice,
    closePromptRef,
    conflictRef,
    applyLoadedState,
    loadSavedDocument,
    downloadInvalidDocument,
    resetInvalidDocument,
    closeWithoutSaving,
    saveAndClose,
    saveCurrent,
    downloadConflictCopy,
    reloadServerVersion,
    keepMineVersion,
  };
}
