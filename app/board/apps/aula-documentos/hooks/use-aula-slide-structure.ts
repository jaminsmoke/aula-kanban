import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import {
  notesForAulaSlides,
  readAulaSlideDrafts,
  replaceAulaSlideDrafts,
  type AulaSlideDraft,
} from "../../../shared/aula-documentos/slide-structure";

type SlideStructureDeps = {
  editor: Editor | null;
  documentId: string | null;
  readOnly: boolean;
  presentationNotes: Record<string, string>;
  setPresentationNotes: (notes: Record<string, string>) => void;
  markChanged: (message?: string) => void;
  setStatus: (message: string) => void;
};

type StructureSnapshot = {
  content: JSONContent;
  notes: Record<string, string>;
  selection: number;
};

/**
 * Gestiona la estructura editable de diapositivas y su deshacer de sesión.
 * @param deps - Editor, notas y permisos del documento.
 * @returns Operaciones de estructura y estado del historial.
 */
export function useAulaSlideStructure({
  editor,
  documentId,
  readOnly,
  presentationNotes,
  setPresentationNotes,
  markChanged,
  setStatus,
}: SlideStructureDeps) {
  const historyRef = useRef<StructureSnapshot[]>([]);
  const previousDocumentId = useRef(documentId);
  const [historyLength, setHistoryLength] = useState(0);

  useEffect(() => {
    if (previousDocumentId.current === documentId) return;
    previousDocumentId.current = documentId;
    historyRef.current = [];
    queueMicrotask(() => setHistoryLength(0));
  }, [documentId]);

  const snapshot = useCallback((): StructureSnapshot | null => {
    if (!editor) return null;
    return {
      content: structuredClone(editor.getJSON()),
      notes: { ...presentationNotes },
      selection: editor.state.selection.from,
    };
  }, [editor, presentationNotes]);

  const pushSnapshot = useCallback((value: StructureSnapshot) => {
    historyRef.current = [...historyRef.current.slice(-19), value];
    setHistoryLength(historyRef.current.length);
  }, []);

  const applySlides = useCallback((slides: AulaSlideDraft[], targetIndex: number, message: string) => {
    if (!editor || readOnly) return false;
    const before = snapshot();
    if (!before) return false;
    if (!replaceAulaSlideDrafts(editor, slides, targetIndex)) return false;
    setPresentationNotes(notesForAulaSlides(slides));
    pushSnapshot(before);
    markChanged(message);
    return true;
  }, [editor, markChanged, pushSnapshot, readOnly, setPresentationNotes, snapshot]);

  const moveSlide = useCallback((index: number, offset: -1 | 1) => {
    const slides = editor && !readOnly ? readAulaSlideDrafts(editor, presentationNotes) : null;
    if (!slides) return false;
    const target = index + offset;
    if (target < 0 || target >= slides.length) return false;
    const [moved] = slides.splice(index, 1);
    slides.splice(target, 0, moved);
    return applySlides(
      slides,
      target,
      offset < 0 ? "Diapositiva movida hacia arriba." : "Diapositiva movida hacia abajo.",
    );
  }, [applySlides, editor, presentationNotes, readOnly]);

  const duplicateSlide = useCallback((index: number) => {
    const slides = editor && !readOnly ? readAulaSlideDrafts(editor, presentationNotes) : null;
    if (!slides || !slides[index]) return false;
    const copy: AulaSlideDraft = {
      content: structuredClone(slides[index].content),
      notes: slides[index].notes,
    };
    slides.splice(index + 1, 0, copy);
    return applySlides(slides, index + 1, "Diapositiva duplicada.");
  }, [applySlides, editor, presentationNotes, readOnly]);

  const deleteSlide = useCallback((index: number) => {
    const slides = editor && !readOnly ? readAulaSlideDrafts(editor, presentationNotes) : null;
    if (!slides || !slides[index]) return false;
    if (slides.length === 1) {
      slides[0] = { content: [], notes: "" };
      return applySlides(slides, 0, "Diapositiva vaciada.");
    }
    slides.splice(index, 1);
    return applySlides(slides, Math.max(0, index - 1), "Diapositiva eliminada.");
  }, [applySlides, editor, presentationNotes, readOnly]);

  const undoStructure = useCallback(() => {
    if (!editor || readOnly) return false;
    const previous = historyRef.current.at(-1);
    if (!previous) return false;
    historyRef.current = historyRef.current.slice(0, -1);
    setHistoryLength(historyRef.current.length);
    editor.commands.setContent(previous.content, { emitUpdate: false });
    setPresentationNotes(previous.notes);
    const target = Math.min(previous.selection, editor.state.doc.content.size);
    editor.chain().focus().setTextSelection(target).scrollIntoView().run();
    markChanged("Estructura de diapositivas restaurada.");
    setStatus("Estructura de diapositivas restaurada.");
    return true;
  }, [editor, markChanged, readOnly, setPresentationNotes, setStatus]);

  return {
    canUndoStructure: historyLength > 0,
    structureHistoryLength: historyLength,
    moveSlide,
    duplicateSlide,
    deleteSlide,
    undoStructure,
  };
}
