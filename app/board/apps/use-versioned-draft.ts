"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowCloseGuard } from "../store/window-close-guard";
import { useAppDocument, type VersionedSaveResult } from "./use-app-document";
import {
  saveVersionedDraftRecovery,
  type VersionedDraftRecoveryReason,
} from "./versioned-draft-recovery";

/** Retraso por defecto del autosave, alineado con Aula Documentos. */
export const VERSIONED_DRAFT_AUTOSAVE_DELAY_MS = 1_600;

/** Conflicto detectado al guardar con una versión del servidor desactualizada. */
export type VersionedDraftConflict = {
  serverUpdatedAt: number | null;
};

/** Copia descargable preparada por la app. */
export type VersionedDraftDownload = {
  contents: string;
  type: string;
  fileName: string;
};

/** Opciones del motor de borrador versionado. */
export type VersionedDraftOptions<T> = {
  /** Proyecto activo. */
  projectId: string;
  /** Identificador de la app en `app_documents`. */
  appId: string;
  /** Devuelve el borrador válido actual, o `null` si aún no se puede guardar. */
  getValue: () => T | null;
  /**
   * Aplica una versión cargada del servidor y devuelve `false` si el contenido
   * no es válido.
   */
  applyLoaded: (value: T, updatedAt: number | null) => boolean;
  /** Retraso del autosave en milisegundos. */
  autosaveDelayMs?: number;
  /** Indica que la app es de solo lectura para el rol actual. */
  readOnly?: boolean;
  /** Prepara la descarga de una copia; por defecto genera JSON. */
  formatCopy?: (value: T) => VersionedDraftDownload;
  /** Escritura de la descarga; se puede sustituir en pruebas. */
  downloadFile?: (contents: string, type: string, fileName: string) => void;
  /** Almacenamiento para la copia recuperable; `null` desactiva la copia local. */
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  /** Se ejecuta cuando el cierre se bloquea por cambios pendientes. */
  onCloseBlocked?: () => void;
};

/**
 * Persiste un borrador con autosave, versión del servidor, conflicto y guarda de
 * cierre. No posee el estado de la app: la app aporta `getValue` y aplica lo que
 * llega del servidor con `applyLoaded`.
 * @param options - Identidad del documento y adaptadores de la app.
 * @returns El estado del borrador y las acciones de guardado y conflicto.
 */
export function useVersionedDraft<T>(options: VersionedDraftOptions<T>) {
  const { load, saveVersioned, loading, updatedAt: storeUpdatedAt, error } = useAppDocument<T>(
    options.projectId,
    options.appId,
  );
  const [initializing, setInitializing] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [conflict, setConflict] = useState<VersionedDraftConflict | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [status, setStatus] = useState("Cargando borrador…");
  const [editVersion, setEditVersion] = useState(0);

  const optionsRef = useRef(options);
  const getValueRef = useRef(options.getValue);
  const applyLoadedRef = useRef(options.applyLoaded);
  const readOnlyRef = useRef(Boolean(options.readOnly));
  const onCloseBlockedRef = useRef(options.onCloseBlocked);
  const mountedRef = useRef(true);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const conflictRef = useRef<VersionedDraftConflict | null>(null);
  const versionRef = useRef<number | null>(null);
  const editVersionRef = useRef(0);

  useEffect(() => {
    optionsRef.current = options;
    getValueRef.current = options.getValue;
    applyLoadedRef.current = options.applyLoaded;
    readOnlyRef.current = Boolean(options.readOnly);
    onCloseBlockedRef.current = options.onCloseBlocked;
  }, [options]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const setDirtyState = useCallback((next: boolean) => {
    dirtyRef.current = next;
    setDirty(next);
  }, []);

  const setConflictState = useCallback((next: VersionedDraftConflict | null) => {
    conflictRef.current = next;
    setConflict(next);
  }, []);

  /**
   * Marca el borrador como modificado y reinicia el debounce del autosave.
   * @param message - Estado opcional que verá la app.
   */
  const markDirty = useCallback((message = "Borrador modificado.") => {
    if (readOnlyRef.current) return;
    editVersionRef.current += 1;
    setEditVersion((version) => version + 1);
    setDirtyState(true);
    setSaveFailed(false);
    setStatus(message);
  }, [setDirtyState]);

  useEffect(() => {
    let active = true;
    void load().then((loaded) => {
      if (!active) return;
      versionRef.current = loaded.updatedAt;
      setUpdatedAt(loaded.updatedAt);
      if (loaded.ok === false) {
        setStatus("No se pudo cargar el borrador guardado.");
        setInitializing(false);
        return;
      }
      if (loaded.state === null) {
        setDirtyState(false);
        setLastSavedAt(null);
        setStatus("No hay un borrador guardado.");
        setInitializing(false);
        return;
      }
      if (editVersionRef.current > 0) {
        versionRef.current = loaded.updatedAt;
        setUpdatedAt(loaded.updatedAt);
        setStatus("Hay cambios locales; no se aplicó el borrador guardado.");
        setInitializing(false);
        return;
      }
      let applied = false;
      try {
        applied = applyLoadedRef.current(loaded.state, loaded.updatedAt);
      } catch {
        applied = false;
      }
      if (applied) {
        setDirtyState(false);
        setLastSavedAt(loaded.updatedAt);
        setStatus("Borrador guardado cargado.");
      } else {
        setDirtyState(false);
        setStatus("No se pudo interpretar el borrador guardado.");
      }
      setInitializing(false);
    }).catch(() => {
      if (!active) return;
      setStatus("No se pudo cargar el borrador guardado.");
      setInitializing(false);
    });
    return () => { active = false; };
  }, [load, setDirtyState]);

  /**
   * Persiste el borrador actual.
   * @param automatic - Indica si lo inició el autosave.
   * @returns `true` si se guardó correctamente.
   */
  const save = useCallback(async (automatic = false): Promise<boolean> => {
    if (readOnlyRef.current || conflictRef.current || savingRef.current) return false;
    const value = getValueRef.current();
    if (value === null) {
      setSaveFailed(true);
      setStatus("No se pudo validar el borrador; no se ha guardado.");
      return false;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);
    setStatus(automatic ? "Guardando automáticamente…" : "Guardando borrador…");
    const versionAtSave = editVersionRef.current;
    let result: VersionedSaveResult;
    try {
      result = await saveVersioned(value, versionRef.current);
    } catch {
      result = { status: "failed" };
    }
    savingRef.current = false;
    if (!mountedRef.current) return result.status === "saved";
    setSaving(false);

    if (result.status === "saved") {
      versionRef.current = result.updatedAt;
      setUpdatedAt(result.updatedAt);
      setLastSavedAt(result.updatedAt);
      if (editVersionRef.current === versionAtSave) setDirtyState(false);
      setConflictNotice(null);
      setStatus(automatic ? "Cambios guardados automáticamente." : "Borrador guardado.");
      return true;
    }

    if (result.status === "conflict") {
      setConflictState({ serverUpdatedAt: result.updatedAt });
      setConflictNotice(null);
      setSaveFailed(false);
      setDirtyState(true);
      setStatus("El borrador cambió en otra sesión. Elige qué versión conservar.");
      return false;
    }

    setSaveFailed(true);
    setDirtyState(true);
    setStatus("No se pudo guardar el borrador. Revisa la conexión.");
    return false;
  }, [saveVersioned, setConflictState, setDirtyState]);

  useEffect(() => {
    if (initializing || loading || readOnlyRef.current || !dirty || saving || saveFailed || conflict) return;
    const timer = window.setTimeout(
      () => { void save(true); },
      options.autosaveDelayMs ?? VERSIONED_DRAFT_AUTOSAVE_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [
    conflict,
    dirty,
    editVersion,
    initializing,
    loading,
    options.autosaveDelayMs,
    save,
    saveFailed,
    saving,
  ]);

  useEffect(() => {
    if (readOnlyRef.current || !dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, options.readOnly]);

  const closeGuard = useCallback(() => {
    if (readOnlyRef.current) return true;
    if (!dirtyRef.current) return true;
    if (conflictRef.current) return false;
    onCloseBlockedRef.current?.();
    return false;
  }, []);
  useWindowCloseGuard(closeGuard);

  /**
   * Recupera el almacenamiento local sin romper la app si el navegador lo niega.
   * @returns El almacenamiento o `null`.
   */
  const recoveryStorage = useCallback((): Pick<Storage, "getItem" | "setItem"> | null => {
    if (optionsRef.current.storage !== undefined) return optionsRef.current.storage;
    try {
      return typeof window === "undefined" ? null : window.localStorage;
    } catch {
      return null;
    }
  }, []);

  /**
   * Prepara la copia descargable del borrador actual.
   * @param value - Borrador válido.
   * @returns Contenido, tipo MIME y nombre de archivo.
   */
  const prepareCopy = useCallback((value: T): VersionedDraftDownload => {
    const format = optionsRef.current.formatCopy;
    if (format) return format(value);
    return {
      contents: JSON.stringify(value, null, 2),
      type: "application/json;charset=utf-8",
      fileName: `${optionsRef.current.appId}-borrador.json`,
    };
  }, []);

  /**
   * Descarga una copia del borrador local.
   * @returns `true` si la descarga se preparó.
   */
  const downloadCopy = useCallback((): boolean => {
    const value = getValueRef.current();
    if (value === null) {
      setConflictNotice("No se pudo preparar la copia porque el borrador no es válido.");
      return false;
    }
    try {
      const copy = prepareCopy(value);
      const download = optionsRef.current.downloadFile ?? downloadTextFile;
      download(copy.contents, copy.type, copy.fileName);
      setConflictNotice("Copia del borrador descargada.");
      setStatus("Copia del borrador descargada.");
      return true;
    } catch {
      setConflictNotice("No se pudo descargar la copia. Revisa los permisos del navegador.");
      setStatus("No se pudo descargar la copia del borrador.");
      return false;
    }
  }, [prepareCopy]);

  /**
   * Guarda una copia recuperable antes de una operación destructiva.
   * @param reason - Motivo de la copia.
   * @returns `true` si la copia quedó guardada.
   */
  const rememberRecovery = useCallback((reason: VersionedDraftRecoveryReason): boolean => {
    const value = getValueRef.current();
    const storage = recoveryStorage();
    if (value === null || !storage) {
      setConflictNotice("No se pudo guardar una copia local del borrador.");
      return false;
    }
    const result = saveVersionedDraftRecovery(storage, optionsRef.current.projectId, optionsRef.current.appId, {
      value,
      reason,
      serverUpdatedAt: conflictRef.current?.serverUpdatedAt ?? null,
    });
    if (!result.ok) {
      setConflictNotice("No se pudo guardar una copia local del borrador.");
      return false;
    }
    return true;
  }, [recoveryStorage]);

  /**
   * Recarga el borrador guardado sin pasar por el diálogo de conflicto. La app
   * debe confirmar antes si hay cambios locales.
   * @returns `true` si el borrador del servidor quedó aplicado.
   */
  const reload = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    const loaded = await load();
    savingRef.current = false;
    if (!mountedRef.current) return false;
    if (loaded.ok === false) {
      setStatus("No se pudo cargar el borrador guardado.");
      return false;
    }
    if (loaded.state === null) {
      setStatus("No hay un borrador guardado.");
      return false;
    }

    let applied = false;
    try {
      applied = applyLoadedRef.current(loaded.state, loaded.updatedAt);
    } catch {
      applied = false;
    }
    if (!applied) {
      setStatus("No se pudo interpretar el borrador guardado.");
      return false;
    }

    versionRef.current = loaded.updatedAt;
    setUpdatedAt(loaded.updatedAt);
    setLastSavedAt(loaded.updatedAt);
    setDirtyState(false);
    setSaveFailed(false);
    setConflictState(null);
    setConflictNotice(null);
    setStatus("Borrador cargado.");
    return true;
  }, [load, setConflictState, setDirtyState]);

  /**
   * Descarta la versión local y recarga la del servidor, conservando antes una
   * copia recuperable o descargable.
   * @returns `true` si la versión del servidor quedó aplicada.
   */
  const reloadServerVersion = useCallback(async (): Promise<boolean> => {
    if (!conflictRef.current || savingRef.current) return false;
    const stored = rememberRecovery("conflict");
    if (!stored && !downloadCopy()) {
      setConflictNotice("No se pudo guardar ni descargar una copia. La versión del servidor no se ha recargado.");
      return false;
    }

    savingRef.current = true;
    setSaving(true);
    setConflictNotice("Recargando la versión del servidor…");
    const loaded = await load();
    savingRef.current = false;
    if (!mountedRef.current) return false;
    setSaving(false);
    if (loaded.ok === false) {
      setConflictNotice("No se pudo recargar. Revisa la conexión e inténtalo de nuevo.");
      setStatus("No se pudo recargar la versión del servidor.");
      return false;
    }
    if (loaded.state === null) {
      setConflictNotice("El servidor ya no tiene un borrador guardado. Se mantiene tu copia local.");
      setStatus("No hay una versión del servidor para recargar.");
      return false;
    }

    let applied = false;
    try {
      applied = applyLoadedRef.current(loaded.state, loaded.updatedAt);
    } catch {
      applied = false;
    }
    if (!applied) {
      setConflictNotice("La versión del servidor no se pudo interpretar. Se mantiene tu copia local.");
      setStatus("La versión del servidor no es válida.");
      return false;
    }

    versionRef.current = loaded.updatedAt;
    setUpdatedAt(loaded.updatedAt);
    setLastSavedAt(loaded.updatedAt);
    setDirtyState(false);
    setSaveFailed(false);
    setConflictState(null);
    setConflictNotice(null);
    setStatus("Versión del servidor recargada.");
    return true;
  }, [downloadCopy, load, rememberRecovery, setConflictState, setDirtyState]);

  /**
   * Descarga una copia y guarda la versión local sobre la del servidor.
   * @returns `true` si la versión local quedó guardada.
   */
  const keepMineVersion = useCallback(async (): Promise<boolean> => {
    const currentConflict = conflictRef.current;
    if (!currentConflict || savingRef.current) return false;
    const value = getValueRef.current();
    if (value === null) {
      setConflictNotice("No se pudo preparar el borrador para conservarlo.");
      return false;
    }
    if (!downloadCopy()) return false;
    rememberRecovery("conflict");

    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);
    setConflictNotice("Guardando tu versión sobre la del servidor…");
    const versionAtSave = editVersionRef.current;
    let result: VersionedSaveResult;
    try {
      result = await saveVersioned(value, currentConflict.serverUpdatedAt);
    } catch {
      result = { status: "failed" };
    }
    savingRef.current = false;
    if (!mountedRef.current) return result.status === "saved";
    setSaving(false);

    if (result.status === "saved") {
      versionRef.current = result.updatedAt;
      setUpdatedAt(result.updatedAt);
      setLastSavedAt(result.updatedAt);
      if (editVersionRef.current === versionAtSave) setDirtyState(false);
      setConflictState(null);
      setConflictNotice(null);
      setStatus("Tu versión se guardó y la copia quedó descargada.");
      return true;
    }

    if (result.status === "conflict") {
      setConflictState({ serverUpdatedAt: result.updatedAt });
      setConflictNotice("La versión del servidor volvió a cambiar. Descarga otra copia antes de reintentar.");
      setSaveFailed(false);
      setDirtyState(true);
      setStatus("La versión del servidor volvió a cambiar.");
      return false;
    }

    setSaveFailed(true);
    setDirtyState(true);
    setConflictNotice("No se pudo guardar tu versión. La copia descargada sigue disponible.");
    setStatus("No se pudo conservar tu versión. Revisa la conexión.");
    return false;
  }, [downloadCopy, rememberRecovery, saveVersioned, setConflictState, setDirtyState]);

  return {
    loading: initializing || loading,
    ready: !initializing,
    dirty,
    saving,
    saveFailed,
    conflict,
    conflictNotice,
    lastSavedAt,
    updatedAt: updatedAt ?? storeUpdatedAt,
    status,
    error,
    setStatus,
    markDirty,
    save,
    reload,
    downloadCopy,
    reloadServerVersion,
    keepMineVersion,
    clearConflictNotice: () => setConflictNotice(null),
  };
}

/**
 * Descarga un texto sin depender de la app que lo usa.
 * @param contents - Contenido del archivo.
 * @param type - Tipo MIME.
 * @param fileName - Nombre de la descarga.
 */
function downloadTextFile(contents: string, type: string, fileName: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
