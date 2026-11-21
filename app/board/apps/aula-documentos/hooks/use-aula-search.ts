"use client";

import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  clearAulaSearchHighlights,
  focusAulaSearchMatch,
  replaceAulaSearchMatches,
  searchAulaDocument,
  setAulaSearchHighlights,
  type AulaSearchMatch,
} from "../../../shared/aula-documentos/search";

type SearchDeps = {
  editor: Editor | null;
  readOnly: boolean;
  setStatus: (message: string) => void;
};

/**
 * Gestiona la búsqueda y el reemplazo del documento activo.
 * @param deps - Editor, permisos y estado compartido.
 * @returns Estado y acciones de búsqueda.
 */
export function useAulaSearch({ editor, readOnly, setStatus }: SearchDeps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [diacriticsSensitive, setDiacriticsSensitive] = useState(false);
  const [matches, setMatches] = useState<AulaSearchMatch[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const recompute = useCallback(() => {
    const found = searchAulaDocument(editor, { query, caseSensitive, diacriticsSensitive });
    setMatches(found);
    setActiveIndex((current) => found.length === 0 ? 0 : Math.min(current, found.length - 1));
  }, [caseSensitive, diacriticsSensitive, editor, query]);

  useEffect(() => {
    if (!searchOpen || !editor) {
      void Promise.resolve().then(() => {
        setMatches([]);
        setActiveIndex(0);
      });
      return;
    }
    void Promise.resolve().then(() => {
      if (searchOpen && editor) recompute();
    });
    editor.on("update", recompute);
    return () => {
      editor.off("update", recompute);
    };
  }, [editor, recompute, searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      clearAulaSearchHighlights(editor);
      return;
    }
    setAulaSearchHighlights(editor, matches, activeIndex);
    focusAulaSearchMatch(editor, matches[activeIndex]);
  }, [activeIndex, editor, matches, searchOpen]);

  const openSearch = useCallback((showReplace = false) => {
    setSearchOpen(true);
    setReplaceOpen(showReplace);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setReplaceOpen(false);
    setQuery("");
    setReplacement("");
    setMatches([]);
    setActiveIndex(0);
    clearAulaSearchHighlights(editor);
    editor?.commands.focus();
  }, [editor]);

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    setActiveIndex((current) => (current + 1) % matches.length);
  }, [matches.length]);

  const goPrevious = useCallback(() => {
    if (matches.length === 0) return;
    setActiveIndex((current) => (current - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const replaceCurrent = useCallback(() => {
    if (readOnly || !matches[activeIndex]) return;
    const changed = replaceAulaSearchMatches(editor, [matches[activeIndex]], replacement);
    if (changed) setStatus("Coincidencia reemplazada.");
  }, [activeIndex, editor, matches, readOnly, replacement, setStatus]);

  const replaceAll = useCallback(() => {
    if (readOnly || matches.length === 0) return;
    const changed = replaceAulaSearchMatches(editor, matches, replacement);
    if (changed) setStatus(`${matches.length} ${matches.length === 1 ? "coincidencia reemplazada" : "coincidencias reemplazadas"}.`);
  }, [editor, matches, readOnly, replacement, setStatus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const app = document.querySelector(".aula-documentos-app");
      if (!app || !(event.target instanceof Node) || !app.contains(event.target)) return;
      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === "f") {
        event.preventDefault();
        openSearch(false);
        return;
      }
      if (command && event.key.toLowerCase() === "h") {
        event.preventDefault();
        openSearch(true);
        return;
      }
      if (event.key === "Escape" && searchOpen) {
        event.preventDefault();
        closeSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSearch, openSearch, searchOpen]);

  return {
    searchOpen,
    replaceOpen,
    query,
    setQuery,
    replacement,
    setReplacement,
    caseSensitive,
    setCaseSensitive,
    diacriticsSensitive,
    setDiacriticsSensitive,
    matches,
    activeIndex,
    activeMatch: matches[activeIndex] ?? null,
    openSearch,
    closeSearch,
    goNext,
    goPrevious,
    replaceCurrent,
    replaceAll,
  };
}
