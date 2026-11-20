"use client";

import { useCallback, useEffect, useState } from "react";
import { applyTheme, resolveTheme, THEME_STORAGE_KEY, THEME_STORAGE_VERSION, type ResolvedTheme, type ThemePreference } from "../../theme";
import { createLocalState } from "./client-storage";

/**
 * Valida la preferencia de tema guardada.
 * @param value - Valor candidato.
 * @returns La preferencia válida o `null`.
 */
function parsePreference(value: unknown): ThemePreference | null {
  return value === "light" || value === "dark" || value === "system" ? value : null;
}

const themeState = createLocalState<ThemePreference>({
  key: THEME_STORAGE_KEY,
  version: THEME_STORAGE_VERSION,
  validate: parsePreference,
  fallback: () => "system",
});

function readPreference(): ThemePreference {
  return themeState.read();
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
    themeState.write(next);
    const nextResolved = resolveTheme(next, systemPrefersDark());
    setPreferenceState(next);
    setResolved(nextResolved);
    applyTheme(nextResolved);
  }, []);

  return { preference, resolved, setPreference };
}
