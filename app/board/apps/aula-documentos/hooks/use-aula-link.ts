import { useState } from "react";
import type { Editor } from "@tiptap/core";
import { normalizeAulaLink } from "../../../../../lib/domain/aula-documentos/document";

type LinkDeps = {
  editor: Editor | null;
  readOnly: boolean;
  setStatus: (message: string) => void;
};

/**
 * Gestiona el panel de enlaces del editor.
 * @param deps - Editor y permisos.
 * @returns Estado y acciones del enlace.
 */
export function useAulaLink({ editor, readOnly, setStatus }: LinkDeps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  /**
   * Abre el panel de enlaces.
   */
  function openLinkPanel() {
    if (!editor || readOnly) return;
    const current = editor.getAttributes("link").href;
    setLinkUrl(typeof current === "string" ? current : "");
    setLinkError(null);
    setLinkOpen(true);
  }

  /**
   * Aplica el enlace escrito al texto seleccionado.
   */
  function applyLink() {
    if (!editor || readOnly) return;
    const href = normalizeAulaLink(linkUrl);
    if (!href) {
      setLinkError("Escribe un enlace http, https o un correo válido.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
    setStatus("Enlace aplicado.");
  }

  /**
   * Quita el enlace del texto seleccionado.
   */
  function removeLink() {
    if (!editor || readOnly) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    setStatus("Enlace quitado.");
  }

  return {
    linkOpen,
    setLinkOpen,
    linkUrl,
    setLinkUrl,
    linkError,
    setLinkError,
    openLinkPanel,
    applyLink,
    removeLink,
  };
}
