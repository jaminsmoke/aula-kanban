import { useState, type MutableRefObject } from "react";
import type { Editor } from "@tiptap/core";
import { uploadAulaImage } from "../editor/image-upload";
import { MERMAID_TEMPLATES } from "../../../../../lib/domain/mermaid/templates";

type ImagesDeps = {
  editorRef: MutableRefObject<Editor | null>;
  readOnly: boolean;
  projectId: string;
  setStatus: (message: string) => void;
};

/**
 * Inserta imágenes, diagramas y saltos de diapositiva en el editor.
 * @param deps - Editor, proyecto y permisos.
 * @returns Estado y acciones de inserción.
 */
export function useAulaImages({ editorRef, readOnly, projectId, setStatus }: ImagesDeps) {
  const [imageUploading, setImageUploading] = useState(false);

  /**
   * Abre el selector local de imágenes.
   */
  function openImagePicker() {
    if (!editorRef.current || readOnly) return;
    const input = document.getElementById("aula-documentos-image-file") as HTMLInputElement | null;
    input?.click();
  }

  /**
   * Sube imágenes y las inserta en la posición indicada.
   * @param files - Imágenes locales.
   * @param position - Posición del documento; si falta, usa la selección actual.
   */
  async function insertImageFiles(files: File[], position?: number) {
    const editor = editorRef.current;
    if (!editor || readOnly || !files.length) return;
    setImageUploading(true);
    setStatus(files.length === 1 ? "Subiendo imagen…" : `Subiendo ${files.length} imágenes…`);
    const nodes: Array<{ type: "aulaImage"; attrs: Record<string, unknown> }> = [];
    let error: string | null = null;
    for (const file of files) {
      const result = await uploadAulaImage(projectId, file);
      if (!result.ok) {
        error = result.message;
        continue;
      }
      nodes.push({
        type: "aulaImage",
        attrs: {
          src: result.url,
          alt: file.name.replace(/\.[^.]+$/, ""),
          caption: "",
          width: 100,
          alignment: "center",
        },
      });
    }
    if (nodes.length) {
      const at = typeof position === "number" ? position : editor.state.selection.from;
      editor.chain().focus(undefined, { scrollIntoView: false }).insertContentAt(at, nodes).run();
    }
    setImageUploading(false);
    if (error) setStatus(`No se pudo insertar una imagen: ${error}`);
    else if (nodes.length) setStatus(nodes.length === 1 ? "Imagen insertada." : `${nodes.length} imágenes insertadas.`);
  }

  /**
   * Inserta un bloque Mermaid con la plantilla de flujo.
   */
  function insertMermaid() {
    const editor = editorRef.current;
    if (!editor || readOnly) return;
    editor.chain().focus(undefined, { scrollIntoView: false }).insertContent({
      type: "mermaidBlock",
      attrs: { code: MERMAID_TEMPLATES[0].code },
    }).run();
    setStatus("Diagrama insertado. Edita el código si lo necesitas.");
  }

  /**
   * Inserta un salto de diapositiva en el documento.
   */
  function insertSlideBreak() {
    const editor = editorRef.current;
    if (!editor || readOnly) return;
    editor.chain().focus(undefined, { scrollIntoView: false }).insertContent({ type: "slideBreak" }).run();
    setStatus("Salto de diapositiva insertado.");
  }

  return {
    imageUploading,
    openImagePicker,
    insertImageFiles,
    insertMermaid,
    insertSlideBreak,
  };
}
