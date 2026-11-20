import { useRef, useState, type MutableRefObject } from "react";
import type { Editor } from "@tiptap/core";
import {
  AULA_DOCUMENT_TEMPLATES,
  type AulaDocumentTemplate,
} from "../../../../../lib/domain/aula-documentos/templates";
import { parseAulaDocument, type AulaDocument } from "../../../../../lib/domain/aula-documentos/document";

type NewDocumentDeps = {
  storeRecoveryCopy: (reason: "replace") => boolean;
  applyDocument: (document: AulaDocument) => void;
  markChanged: (message?: string) => void;
  titleRef: MutableRefObject<HTMLInputElement | null>;
  editorRef: MutableRefObject<Editor | null>;
};

/**
 * Gestiona la elección de plantillas y la creación de documentos nuevos.
 * @param deps - Estado compartido y referencias de foco.
 * @returns Estado y acciones del documento nuevo.
 */
export function useAulaNewDocument({
  storeRecoveryCopy,
  applyDocument,
  markChanged,
  titleRef,
  editorRef,
}: NewDocumentDeps) {
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [newDocumentPreview, setNewDocumentPreview] = useState<{ template: AulaDocumentTemplate; document: AulaDocument } | null>(null);
  const [newDocumentError, setNewDocumentError] = useState<string | null>(null);
  const newDocumentRef = useRef<HTMLElement>(null);

  /**
   * Abre el selector de plantillas para un documento nuevo.
   */
  function openNewDocument() {
    setNewDocumentPreview(null);
    setNewDocumentError(null);
    setNewDocumentOpen(true);
  }

  /**
   * Cierra el selector de plantillas y limpia su estado.
   */
  function closeNewDocument() {
    setNewDocumentOpen(false);
    setNewDocumentPreview(null);
    setNewDocumentError(null);
  }

  /**
   * Prepara la vista previa de una plantilla antes de reemplazar el documento.
   * @param template - Plantilla elegida.
   */
  function selectNewDocumentTemplate(template: AulaDocumentTemplate) {
    const parsed = parseAulaDocument(template.create());
    if (!parsed.ok) {
      setNewDocumentPreview(null);
      setNewDocumentError(parsed.message);
      return;
    }
    setNewDocumentPreview({ template, document: parsed.document });
    setNewDocumentError(null);
  }

  /**
   * Sustituye el documento actual por la plantilla confirmada.
   */
  function applyNewDocument() {
    if (!newDocumentPreview) return;
    const { template, document } = newDocumentPreview;
    if (!storeRecoveryCopy("replace")) {
      setNewDocumentError("No se pudo guardar una copia local antes de reemplazar. El documento actual no ha cambiado.");
      return;
    }
    applyDocument(document);
    markChanged(`Documento creado desde «${template.name}». Guárdalo para conservarlo.`);
    closeNewDocument();
    window.setTimeout(() => {
      if (template.focus === "title") {
        titleRef.current?.focus();
        titleRef.current?.scrollIntoView?.({ block: "nearest" });
      } else {
        editorRef.current?.commands.focus("end", { scrollIntoView: false });
        editorRef.current?.view.dom.scrollIntoView?.({ block: "nearest" });
      }
    }, 0);
  }

  return {
    templates: AULA_DOCUMENT_TEMPLATES,
    newDocumentOpen,
    newDocumentPreview,
    setNewDocumentPreview,
    newDocumentError,
    newDocumentRef,
    openNewDocument,
    closeNewDocument,
    selectNewDocumentTemplate,
    applyNewDocument,
  };
}
