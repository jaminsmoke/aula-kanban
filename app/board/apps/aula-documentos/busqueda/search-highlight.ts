import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { AulaSearchMatch } from "./search";
import { AULA_SEARCH_META } from "./search-meta";

const searchPluginKey = new PluginKey<DecorationSet>("aula-search-highlight");

/** Extensión que pinta las coincidencias de búsqueda sin modificar el documento. */
export const AulaSearchHighlight = Extension.create({
  name: "aulaSearchHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: searchPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (transaction, previous) => {
            const meta = transaction.getMeta(AULA_SEARCH_META) as { matches: AulaSearchMatch[]; activeIndex: number } | undefined;
            if (!meta) return previous.map(transaction.mapping, transaction.doc);
            const decorations = meta.matches.flatMap((match, index) => (
              match.from < match.to
                ? [Decoration.inline(match.from, match.to, {
                  class: index === meta.activeIndex ? "aula-search-match is-active" : "aula-search-match",
                })]
                : []
            ));
            return DecorationSet.create(transaction.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return searchPluginKey.getState(state);
          },
        },
      }),
    ];
  },
});
