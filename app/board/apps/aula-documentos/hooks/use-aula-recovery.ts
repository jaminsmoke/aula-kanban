import { useRef, useState, type MutableRefObject } from "react";
import {
  listAulaRecoveryCopies,
  saveAulaRecoveryCopy,
  type AulaRecoveryCopy,
  type AulaRecoveryReason,
} from "../../../../../lib/domain/aula-documentos/recovery";
import { parseAulaDocument, type AulaDocument } from "../../../../../lib/domain/aula-documentos/document";
import { downloadTextFile } from "../utils/document-view";
import { aulaRecoveryFileName } from "../../../../../lib/domain/aula-documentos/filename";

type RecoveryDeps = {
  projectId: string;
  currentDocument: () => AulaDocument | null;
  applyDocument: (document: AulaDocument) => void;
  markChanged: (message?: string) => void;
  setStatus: (message: string) => void;
  documentVersionRef: MutableRefObject<number | null>;
};

/**
 * Agrupa las copias locales de recuperación del navegador.
 * @param deps - Documento actual y estado compartido de la app.
 * @returns Estado y acciones de recuperación.
 */
export function useAulaRecovery({
  projectId,
  currentDocument,
  applyDocument,
  markChanged,
  setStatus,
  documentVersionRef,
}: RecoveryDeps) {
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryCopies, setRecoveryCopies] = useState<AulaRecoveryCopy[]>([]);
  const [recoveryCount, setRecoveryCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      return listAulaRecoveryCopies(window.localStorage, projectId).length;
    } catch {
      return 0;
    }
  });
  const [recoveryRestoreId, setRecoveryRestoreId] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const recoveryRef = useRef<HTMLElement>(null);

  /**
   * Guarda una copia local del documento antes de una operación destructiva.
   * @param reason - Motivo de la copia.
   * @param serverUpdatedAt - Versión del servidor asociada; por defecto, la cargada.
   * @returns `true` si la copia quedó almacenada en el navegador.
   */
  function storeRecoveryCopy(
    reason: AulaRecoveryReason,
    serverUpdatedAt: number | null = documentVersionRef.current,
  ): boolean {
    const document = currentDocument();
    if (!document) return false;
    try {
      const result = saveAulaRecoveryCopy(window.localStorage, projectId, {
        document,
        reason,
        serverUpdatedAt,
      });
      if (!result.ok) {
        setStatus(result.reason === "quota"
          ? "No hay espacio para la copia local. Descarga el documento antes de continuar."
          : "La copia local supera el tamaño permitido. Descarga el documento antes de continuar.");
        return false;
      }
      setRecoveryCount(result.copies.length);
      return true;
    } catch {
      setStatus("No se pudo guardar la copia local en este navegador.");
      return false;
    }
  }

  /**
   * Abre la lista de copias locales guardadas en el navegador.
   */
  function openRecoveryCopies() {
    try {
      const copies = listAulaRecoveryCopies(window.localStorage, projectId);
      setRecoveryCopies(copies);
      setRecoveryCount(copies.length);
    } catch {
      setRecoveryCopies([]);
      setRecoveryCount(0);
    }
    setRecoveryRestoreId(null);
    setRecoveryNotice(null);
    setRecoveryOpen(true);
  }

  /**
   * Cierra la lista de copias locales.
   */
  function closeRecoveryCopies() {
    setRecoveryOpen(false);
    setRecoveryRestoreId(null);
    setRecoveryNotice(null);
  }

  /**
   * Descarga una copia local como JSON.
   * @param copy - Copia elegida.
   */
  function downloadRecoveryCopy(copy: AulaRecoveryCopy) {
    try {
      downloadTextFile(
        JSON.stringify(copy.document, null, 2),
        "application/json;charset=utf-8",
        aulaRecoveryFileName(copy.title),
      );
      setRecoveryNotice("Copia descargada.");
    } catch {
      setRecoveryNotice("No se pudo descargar la copia.");
    }
  }

  /**
   * Restaura una copia local en el editor, sin guardarla todavía en el servidor.
   * @param copy - Copia confirmada.
   */
  function restoreRecoveryCopy(copy: AulaRecoveryCopy) {
    const parsed = parseAulaDocument(copy.document);
    if (!parsed.ok) {
      setRecoveryNotice(parsed.message);
      return;
    }
    applyDocument(parsed.document);
    closeRecoveryCopies();
    markChanged("Copia local restaurada. Guárdala para conservarla en el proyecto.");
    setStatus("Copia local restaurada en el editor. Todavía no se ha guardado en el servidor.");
  }

  return {
    recoveryOpen,
    setRecoveryOpen,
    recoveryCopies,
    recoveryCount,
    recoveryRestoreId,
    setRecoveryRestoreId,
    recoveryNotice,
    setRecoveryNotice,
    recoveryRef,
    storeRecoveryCopy,
    openRecoveryCopies,
    closeRecoveryCopies,
    downloadRecoveryCopy,
    restoreRecoveryCopy,
  };
}
