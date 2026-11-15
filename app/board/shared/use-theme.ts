"use client";

import { useCallback, useEffect, useState } from "react";
import { applyTheme, resolveTheme, THEME_STORAGE_KEY, type ResolvedTheme, type ThemePreference } from "../../theme";

function readPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

/**
 * Mantiene el tema resuelto y la preferencia persistida.
 * El atributo inicial lo escribe `THEME_INIT_SCRIPT` antes de la hidratación.
 * @returns La preferencia actual, el tema resuelto y su actualizador.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>(() => (
    typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light"
  ));

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");

    function sync() {
      const nextPreference = readPreference();
      const next = resolveTheme(nextPreference, media?.matches ?? false);
      setPreferenceState(nextPreference);
      setResolved(next);
      applyTheme(next);
    }

    function onMediaChange() {
      if (readPreference() === "system") sync();
    }

    function onStorage(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY) sync();
    }

    sync();
    media?.addEventListener("change", onMediaChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media?.removeEventListener("change", onMediaChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // La preferencia sigue aplicándose en esta pestaña aunque no se pueda guardar.
    }
    const nextResolved = resolveTheme(next, systemPrefersDark());
    setPreferenceState(next);
    setResolved(nextResolved);
    applyTheme(nextResolved);
  }, []);

  return { preference, resolved, setPreference };
}
