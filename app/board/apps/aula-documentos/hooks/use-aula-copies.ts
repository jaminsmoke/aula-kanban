import { useRef, useState } from "react";
import type { AulaDocument } from "../../../../../lib/domain/aula-documentos/document";
import type { AulaDocumentStats } from "../../../../../lib/domain/aula-documentos/document";
import type { AulaCopyAsset, AulaCopyManifest } from "../../../../../lib/domain/aula-documentos/copy";
import type { AulaCopySummary } from "../../../shared/aula-documentos/copy-client";
import { uploadAulaImage } from "../../../shared/aula-documentos/image-upload";
import { buildPortableCopy } from "../utils/document-assets";
import { downloadBlob, remapCopyImageUrls } from "../utils/document-view";
import { parseAulaDocument } from "../../../../../lib/domain/aula-documentos/document";
import { aulaFileName } from "../../../../../lib/domain/aula-documentos/filename";

export type CopyImportPreview = {
  fileName: string;
  document: AulaDocument;
  manifest: AulaCopyManifest;
  assets: AulaCopyAsset[];
  stats: AulaDocumentStats;
  warnings: string[];
  createdAtLabel: string;
};

export type AulaCopyView = AulaCopySummary & {
  sizeLabel: string;
  dateLabel: string;
};

type CopiesDeps = {
  projectId: string;
  readOnly: boolean;
  currentDocument: () => AulaDocument | null;
  storeRecoveryCopy: (reason: "replace") => boolean;
  applyDocument: (document: AulaDocument) => void;
  markChanged: (message?: string) => void;
  setStatus: (message: string) => void;
};

/**
 * Gestiona las copias portables guardadas en el proyecto y su importación.
 * @param deps - Proyecto, permisos y documento actual.
 * @returns Estado y acciones de copias portables.
 */
export function useAulaCopies({
  projectId,
  readOnly,
  currentDocument,
  storeRecoveryCopy,
  applyDocument,
  markChanged,
  setStatus,
}: CopiesDeps) {
  const [copiesOpen, setCopiesOpen] = useState(false);
  const [copies, setCopies] = useState<AulaCopyView[]>([]);
  const [copiesLoading, setCopiesLoading] = useState(false);
  const [copiesError, setCopiesError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [copySaving, setCopySaving] = useState(false);
  const [copyDeleteId, setCopyDeleteId] = useState<string | null>(null);
  const [copyImport, setCopyImport] = useState<CopyImportPreview | null>(null);
  const [copyImportOpen, setCopyImportOpen] = useState(false);
  const [copyImportConfirm, setCopyImportConfirm] = useState(false);
  const [copyImportBusy, setCopyImportBusy] = useState(false);
  const [copyImportError, setCopyImportError] = useState<string | null>(null);
  const copiesRef = useRef<HTMLElement>(null);
  const copyImportRef = useRef<HTMLElement>(null);

  /**
   * Abre el panel de copias portables.
   */
  function openCopies() {
    setCopiesOpen(true);
    setCopyNotice(null);
    setCopiesError(null);
    setCopyDeleteId(null);
    void refreshCopies();
  }

  /**
   * Cierra el panel de copias portables.
   */
  function closeCopies() {
    setCopiesOpen(false);
    setCopyDeleteId(null);
    setCopyNotice(null);
  }

  /**
   * Recarga las copias guardadas en el proyecto.
   */
  async function refreshCopies() {
    setCopiesLoading(true);
    setCopiesError(null);
    const { aulaCopyDateLabel, aulaCopySizeLabel, listAulaCopies } = await import("../../../shared/aula-documentos/copy-client");
    const result = await listAulaCopies(projectId);
    setCopiesLoading(false);
    if (!result || !result.ok) {
      setCopies([]);
      setCopiesError(result?.message ?? "No se pudieron leer las copias.");
      return;
    }
    setCopies(result.copies.map((copy) => ({
      ...copy,
      dateLabel: aulaCopyDateLabel(copy.createdAt),
      sizeLabel: aulaCopySizeLabel(copy.sizeBytes),
    })));
  }

  /**
   * Guarda una copia portable del documento actual en el proyecto.
   */
  async function saveCurrentCopy() {
    const document = currentDocument();
    if (!document || readOnly || copySaving) return;
    setCopySaving(true);
    setCopyNotice("Preparando copia portable…");
    try {
      const built = await buildPortableCopy(document);
      if (!built.ok) {
        setCopyNotice(built.message);
        return;
      }
      const { saveAulaCopy } = await import("../../../shared/aula-documentos/copy-client");
      const result = await saveAulaCopy(projectId, built.bytes, aulaFileName(document.title, "aula.zip"));
      if (!result.ok) {
        setCopyNotice(result.message);
        return;
      }
      setCopyNotice("Copia guardada en el proyecto.");
      setStatus("Copia portable guardada.");
      await refreshCopies();
    } catch {
      setCopyNotice("No se pudo guardar la copia portable.");
    } finally {
      setCopySaving(false);
    }
  }

  /**
   * Descarga una copia portable generada en el navegador, sin usar R2.
   */
  async function downloadLocalCopy() {
    const document = currentDocument();
    if (!document) return;
    setCopyNotice("Preparando copia local…");
    try {
      const built = await buildPortableCopy(document);
      if (!built.ok) {
        setCopyNotice(built.message);
        return;
      }
      downloadBlob(
        new Blob([built.bytes.slice().buffer as ArrayBuffer], { type: "application/zip" }),
        aulaFileName(document.title, "aula.zip"),
      );
      setCopyNotice("Copia local descargada.");
    } catch {
      setCopyNotice("No se pudo descargar la copia local.");
    }
  }

  /**
   * Descarga una copia guardada en R2.
   * @param copy - Copia elegida.
   */
  async function downloadStoredCopy(copy: AulaCopySummary) {
    setCopyNotice("Descargando copia…");
    const { downloadAulaCopy } = await import("../../../shared/aula-documentos/copy-client");
    const result = await downloadAulaCopy(copy);
    if (!result.ok) {
      setCopyNotice(result.message);
      return;
    }
    downloadBlob(result.blob, aulaFileName(copy.title, "aula.zip"));
    setCopyNotice("Copia descargada.");
  }

  /**
   * Borra una copia guardada en R2.
   * @param copy - Copia elegida.
   */
  async function removeStoredCopy(copy: AulaCopySummary) {
    setCopyNotice("Borrando copia…");
    const { deleteAulaCopy } = await import("../../../shared/aula-documentos/copy-client");
    const result = await deleteAulaCopy(copy);
    if (!result.ok) {
      setCopyNotice(result.message);
      return;
    }
    setCopies((current) => current.filter((item) => item.id !== copy.id));
    setCopyDeleteId(null);
    setCopyNotice("Copia borrada.");
    setStatus("Copia portable borrada.");
  }

  /**
   * Abre el selector de una copia portable.
   */
  function openCopyImportPicker() {
    if (readOnly) return;
    const input = document.getElementById("aula-documentos-copy-file") as HTMLInputElement | null;
    input?.click();
  }

  /**
   * Lee una copia portable y prepara su vista previa.
   * @param file - Archivo elegido.
   */
  async function prepareCopyImport(file: File | undefined) {
    if (!file || readOnly) return;
    setStatus("Leyendo copia portable…");
    setCopyImportError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { readAulaDocumentCopy } = await import("../../../../../lib/domain/aula-documentos/copy");
      const { aulaCopyDateLabel } = await import("../../../shared/aula-documentos/copy-client");
      const result = await readAulaDocumentCopy(bytes);
      if (!result.ok) {
        setStatus(result.message);
        return;
      }
      const parsed = parseAulaDocument(result.document);
      if (!parsed.ok) {
        setStatus(parsed.message);
        return;
      }
      setCopyImport({
        fileName: file.name,
        document: result.document,
        manifest: result.manifest,
        assets: result.assets,
        stats: parsed.stats,
        createdAtLabel: aulaCopyDateLabel(Date.parse(result.manifest.createdAt)),
        warnings: result.assets.length
          ? [`La copia incluye ${result.assets.length} ${result.assets.length === 1 ? "imagen" : "imágenes"}; se volverán a subir al proyecto al importar.`]
          : [],
      });
      setCopyImportConfirm(false);
      setCopyImportOpen(true);
      setStatus("Copia lista para importar.");
    } catch {
      setStatus("No se pudo leer la copia portable.");
    }
  }

  /**
   * Cierra la vista previa de una copia portable.
   */
  function closeCopyImport() {
    if (copyImportBusy) return;
    setCopyImportOpen(false);
    setCopyImport(null);
    setCopyImportConfirm(false);
    setCopyImportError(null);
  }

  /**
   * Sustituye el documento actual por una copia portable confirmada.
   */
  async function applyCopyImport() {
    if (!copyImport || !copyImportConfirm || copyImportBusy) return;
    setCopyImportBusy(true);
    setCopyImportError(null);
    try {
      const urls = new Map<string, string>();
      for (const asset of copyImport.assets) {
        const extension = asset.mime.split("/", 2)[1] ?? "bin";
        const file = new File(
          [asset.bytes.slice().buffer as ArrayBuffer],
          `${asset.id}.${extension}`,
          { type: asset.mime },
        );
        const uploaded = await uploadAulaImage(projectId, file);
        if (!uploaded.ok) {
          setCopyImportError(uploaded.message);
          return;
        }
        urls.set(asset.id, uploaded.url);
      }

      const imported = parseAulaDocument(remapCopyImageUrls(copyImport.document, urls));
      if (!imported.ok) {
        setCopyImportError(imported.message);
        return;
      }
      if (!storeRecoveryCopy("replace")) {
        setCopyImportError("No se pudo guardar una copia local antes de reemplazar. El documento actual no ha cambiado.");
        return;
      }
      applyDocument(imported.document);
      markChanged(`Copia portable importada desde ${copyImport.fileName}. Guárdala para conservarla.`);
      setStatus("Copia portable importada. Guárdala para conservarla en el proyecto.");
      setCopyImportOpen(false);
      setCopyImport(null);
      setCopyImportConfirm(false);
    } catch {
      setCopyImportError("No se pudo importar la copia portable.");
    } finally {
      setCopyImportBusy(false);
    }
  }

  return {
    copiesOpen,
    copies,
    copiesLoading,
    copiesError,
    copyNotice,
    copySaving,
    copyDeleteId,
    setCopyDeleteId,
    copyImport,
    copyImportOpen,
    copyImportConfirm,
    setCopyImportConfirm,
    copyImportBusy,
    copyImportError,
    copiesRef,
    copyImportRef,
    openCopies,
    closeCopies,
    refreshCopies,
    saveCurrentCopy,
    downloadLocalCopy,
    downloadStoredCopy,
    removeStoredCopy,
    openCopyImportPicker,
    prepareCopyImport,
    closeCopyImport,
    applyCopyImport,
  };
}
