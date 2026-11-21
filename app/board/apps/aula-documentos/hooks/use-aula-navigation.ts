import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import {
  activeAulaOutlineIndex,
  buildAulaOutline,
  buildAulaSlideIndex,
  flattenAulaOutline,
  type AulaOutlineRow,
  type AulaSlideEntry,
} from "../navegacion/outline";

type NavigationDeps = {
  editor: Editor | null;
};

/**
 * Mantiene el esquema y las diapositivas sincronizados con el documento activo.
 * @param deps - Editor de Aula Documentos.
 * @returns Esquema, diapositivas, sección activa y saltos.
 */
export function useAulaNavigation({ editor }: NavigationDeps) {
  const [docRevision, setDocRevision] = useState(0);
  const [selectionFrom, setSelectionFrom] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const onTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (transaction.docChanged) setDocRevision((current) => current + 1);
      if (transaction.docChanged || transaction.selectionSet) setSelectionFrom(editor.state.selection.from);
    };
    editor.on("transaction", onTransaction);
    queueMicrotask(() => setSelectionFrom(editor.state.selection.from));
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor]);

  const outline = useMemo<AulaOutlineRow[]>(() => {
    void docRevision;
    return flattenAulaOutline(buildAulaOutline(editor));
  }, [docRevision, editor]);
  const slides = useMemo<AulaSlideEntry[]>(() => {
    void docRevision;
    return buildAulaSlideIndex(editor);
  }, [docRevision, editor]);
  const activeOutlineIndex = activeAulaOutlineIndex(outline, selectionFrom);
  const activeSlideIndex = slides.reduce(
    (active, slide, index) => slide.from <= selectionFrom ? index : active,
    0,
  );

  const jump = useCallback((position: number) => {
    if (!editor) return;
    const target = Math.min(position + 1, editor.state.doc.content.size);
    editor.chain().focus().setTextSelection(target).scrollIntoView().run();
  }, [editor]);

  return {
    outline,
    slides,
    activeOutlineIndex,
    activeSlideIndex,
    jumpToOutline: (row: AulaOutlineRow) => jump(row.from),
    jumpToSlide: (slide: AulaSlideEntry) => jump(slide.from),
  };
}
