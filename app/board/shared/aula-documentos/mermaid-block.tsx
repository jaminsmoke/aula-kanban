"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MermaidBlockView } from "./mermaid-block-view";
import type { MermaidDraftStorage } from "./mermaid-block-storage";

export {
  flushMermaidDrafts,
  registerMermaidDraft,
  setMermaidDraftChangeHandler,
  unregisterMermaidDraft,
} from "./mermaid-block-storage";

/** Nodo bloque que guarda el código Mermaid dentro del documento. */
export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addStorage(): MermaidDraftStorage {
    return {
      drafts: new Map<string, () => void>(),
      onDraftChange: null,
    };
  },
  addAttributes() {
    return {
      code: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mermaid-code") ?? "",
        renderHTML: (attributes) => ({ "data-mermaid-code": attributes.code }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-mermaid-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-mermaid-block": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockView);
  },
});
