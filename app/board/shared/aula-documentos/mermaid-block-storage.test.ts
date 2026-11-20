import type { Editor } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";
import {
  flushMermaidDrafts,
  notifyMermaidDraftChange,
  registerMermaidDraft,
  setMermaidDraftChangeHandler,
  unregisterMermaidDraft,
  type MermaidDraftStorage,
} from "./mermaid-block-storage";

/**
 * Crea un editor mínimo con el almacén Mermaid.
 * @returns El editor simulado.
 */
function editorWithStorage() {
  const storage: MermaidDraftStorage = {
    drafts: new Map<string, () => void>(),
    onDraftChange: null,
  };
  return {
    editor: { storage: { mermaidBlock: storage } } as unknown as Editor,
    storage,
  };
}

describe("borradores Mermaid", () => {
  it("registra, avisa, vuelca y retira borradores", () => {
    const { editor, storage } = editorWithStorage();
    const flush = vi.fn();
    const onChange = vi.fn();

    registerMermaidDraft(editor, "bloque-1", flush);
    setMermaidDraftChangeHandler(editor, onChange);
    notifyMermaidDraftChange(editor);
    flushMermaidDrafts(editor);

    expect(storage.drafts.has("bloque-1")).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(1);

    unregisterMermaidDraft(editor, "bloque-1");
    expect(storage.drafts.has("bloque-1")).toBe(false);
  });
});
