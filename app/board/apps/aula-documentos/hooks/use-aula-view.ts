import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";

type ViewDeps = {
  editor: Editor | null;
  searchOpen: boolean;
};

/**
 * Controla el modo enfoque y la visibilidad del esquema durante la sesión.
 * @param deps - Editor y estado de la búsqueda para resolver `Escape`.
 * @returns Estado de vista y acciones de navegación.
 */
export function useAulaView({ editor, searchOpen }: ViewDeps) {
  const [focusMode, setFocusMode] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const originRef = useRef<HTMLElement | null>(null);

  const enterFocus = useCallback((origin?: HTMLElement) => {
    const active = origin ?? document.activeElement;
    originRef.current = active instanceof HTMLElement ? active : null;
    setFocusMode(true);
  }, []);

  const exitFocus = useCallback(() => {
    if (!focusMode) return;
    setFocusMode(false);
    const origin = originRef.current;
    originRef.current = null;
    queueMicrotask(() => {
      if (origin?.isConnected) origin.focus();
      else editor?.commands.focus();
    });
  }, [editor, focusMode]);

  const toggleFocus = useCallback((origin?: HTMLElement) => {
    if (focusMode) exitFocus();
    else enterFocus(origin);
  }, [enterFocus, exitFocus, focusMode]);

  const toggleOutline = useCallback(() => {
    setOutlineOpen((current) => !current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const app = document.querySelector(".aula-documentos-app");
      if (!app || !(event.target instanceof Node) || !app.contains(event.target)) return;
      const key = event.key.toLowerCase();
      if (event.altKey && event.shiftKey && key === "f") {
        event.preventDefault();
        toggleFocus();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === "o") {
        event.preventDefault();
        toggleOutline();
        return;
      }
      if (
        event.key === "Escape"
        && focusMode
        && !searchOpen
        && !document.querySelector(".aula-documentos-modal-backdrop")
      ) {
        event.preventDefault();
        exitFocus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitFocus, focusMode, searchOpen, toggleFocus, toggleOutline]);

  return {
    focusMode,
    outlineOpen,
    enterFocus,
    exitFocus,
    toggleFocus,
    toggleOutline,
  };
}
