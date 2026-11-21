"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { AlignCenter, AlignLeft, AlignRight, Pencil, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
  AULA_IMAGE_ALIGNMENTS,
  AULA_IMAGE_ACCEPT,
  AULA_IMAGE_MAX_WIDTH,
  AULA_IMAGE_MIN_WIDTH,
  AULA_IMAGE_MAX_ALT_LENGTH,
  AULA_IMAGE_MAX_CAPTION_LENGTH,
  type AulaImageAlignment,
} from "../../../../../lib/domain/aula-documentos/image";
import { uploadAulaImage } from "./image-upload";

type AulaImageOptions = {
  projectId: string;
};

/**
 * Vista editable de una imagen dentro del documento.
 * @param props - Props del NodeView de Tiptap.
 * @returns La imagen con pie y controles de edición.
 */
function AulaImageView({ node, deleteNode, editor, selected, updateAttributes, extension }: NodeViewProps) {
  const readOnly = !editor.isEditable;
  const projectId = (extension.options as AulaImageOptions).projectId;
  const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
  const caption = typeof node.attrs.caption === "string" ? node.attrs.caption : "";
  const width = typeof node.attrs.width === "number" ? node.attrs.width : AULA_IMAGE_MAX_WIDTH;
  const alignment = typeof node.attrs.alignment === "string" ? node.attrs.alignment as AulaImageAlignment : "center";
  const [editing, setEditing] = useState(false);
  const [draftAlt, setDraftAlt] = useState(alt);
  const [draftCaption, setDraftCaption] = useState(caption);
  const [draftWidth, setDraftWidth] = useState(width);
  const [draftAlignment, setDraftAlignment] = useState<AulaImageAlignment>(alignment);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  /**
   * Abre la edición con los valores actuales de la imagen.
   */
  function startEditing() {
    setDraftAlt(alt);
    setDraftCaption(caption);
    setDraftWidth(width);
    setDraftAlignment(alignment);
    setEditing(true);
  }

  /**
   * Guarda los cambios de texto y presentación de la imagen.
   */
  function applyDetails() {
    updateAttributes({
      alt: draftAlt.trim(),
      caption: draftCaption.trim(),
      width: draftWidth,
      alignment: draftAlignment,
    });
    setEditing(false);
    setError(null);
  }

  /**
   * Sube y sustituye la imagen conservando su descripción y pie.
   * @param file - Nueva imagen.
   */
  async function replaceImage(file: File | undefined) {
    if (!file || !projectId) return;
    setUploading(true);
    setError(null);
    const result = await uploadAulaImage(projectId, file);
    setUploading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    updateAttributes({ src: result.url });
  }

  return (
    <NodeViewWrapper
      as="figure"
      className={`aula-image-block is-${alignment}${selected ? " is-selected" : ""}`}
      data-aula-image=""
      contentEditable={false}
    >
      <div className="aula-image-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} style={{ width: `${width}%` }} loading="lazy" />
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}

      {!readOnly && (selected || editing) ? (
        <div className="aula-image-controls">
          <button type="button" onClick={() => { if (editing) setEditing(false); else startEditing(); }} aria-label="Editar imagen" title="Editar imagen">
            <Pencil size={14} aria-hidden />
          </button>
          <button type="button" onClick={() => replaceRef.current?.click()} aria-label="Reemplazar imagen" title="Reemplazar imagen" disabled={uploading}>
            <Upload size={14} aria-hidden />
          </button>
          <button type="button" onClick={() => deleteNode()} aria-label="Eliminar imagen" title="Eliminar imagen">
            <Trash2 size={14} aria-hidden />
          </button>
          <input
            ref={replaceRef}
            className="aula-documentos-file-input"
            type="file"
            accept={AULA_IMAGE_ACCEPT}
            aria-label="Elegir imagen de reemplazo"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void replaceImage(file);
            }}
          />
        </div>
      ) : null}

      {editing && !readOnly ? (
        <div className="aula-image-editor">
          <label>
            <span>Texto alternativo</span>
            <input
              value={draftAlt}
              maxLength={AULA_IMAGE_MAX_ALT_LENGTH}
              onChange={(event) => setDraftAlt(event.target.value)}
              placeholder="Describe la imagen"
              aria-label="Texto alternativo de la imagen"
            />
          </label>
          <label>
            <span>Pie</span>
            <input
              value={draftCaption}
              maxLength={AULA_IMAGE_MAX_CAPTION_LENGTH}
              onChange={(event) => setDraftCaption(event.target.value)}
              placeholder="Pie opcional"
              aria-label="Pie de la imagen"
            />
          </label>
          <label>
            <span>Ancho</span>
            <input
              type="range"
              min={AULA_IMAGE_MIN_WIDTH}
              max={AULA_IMAGE_MAX_WIDTH}
              value={draftWidth}
              onChange={(event) => setDraftWidth(Number(event.target.value))}
              aria-label="Ancho de la imagen"
            />
          </label>
          <div className="aula-image-align" role="group" aria-label="Alineación de la imagen">
            {AULA_IMAGE_ALIGNMENTS.map((option) => {
              const Icon = option === "left" ? AlignLeft : option === "right" ? AlignRight : AlignCenter;
              const label = option === "left" ? "izquierda" : option === "right" ? "derecha" : "centro";
              return (
                <button
                  key={option}
                  type="button"
                  className={draftAlignment === option ? "is-active" : ""}
                  aria-label={`Alinear imagen a la ${label}`}
                  aria-pressed={draftAlignment === option}
                  onClick={() => setDraftAlignment(option)}
                >
                  <Icon size={14} aria-hidden />
                </button>
              );
            })}
          </div>
          <div className="aula-image-editor-actions">
            <button type="button" onClick={() => setEditing(false)}>Cancelar</button>
            <button type="button" className="primary" onClick={applyDetails}>Aplicar</button>
          </div>
        </div>
      ) : null}
      {uploading ? <p className="aula-image-status" role="status">Subiendo imagen…</p> : null}
      {error ? <p className="aula-image-error" role="alert">{error}</p> : null}
    </NodeViewWrapper>
  );
}

/** Imagen local con texto alternativo, pie y presentación editable. */
export const AulaImage = Node.create<AulaImageOptions>({
  name: "aulaImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addOptions() {
    return { projectId: "" };
  },
  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
      width: { default: AULA_IMAGE_MAX_WIDTH },
      alignment: { default: "center" },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-aula-image]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const {
      src: rawSrc,
      alt: rawAlt,
      caption: rawCaption,
      width: rawWidth,
      alignment: rawAlignment,
      ...rest
    } = HTMLAttributes;
    const src = typeof rawSrc === "string" ? rawSrc : "";
    const alt = typeof rawAlt === "string" ? rawAlt : "";
    const caption = typeof rawCaption === "string" ? rawCaption : "";
    const width = typeof rawWidth === "number" ? rawWidth : AULA_IMAGE_MAX_WIDTH;
    const alignment = typeof rawAlignment === "string"
      && (AULA_IMAGE_ALIGNMENTS as readonly string[]).includes(rawAlignment)
      ? rawAlignment
      : "center";
    return [
      "figure",
      mergeAttributes(rest, {
        "data-aula-image": "",
        class: `aula-image-block is-${alignment}`,
      }),
      ["img", { src, alt, style: `width:${width}%` }],
      ...(caption ? [["figcaption", {}, caption]] : []),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AulaImageView);
  },
});
