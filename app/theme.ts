export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "aula-kanban-theme";

/**
 * Resuelve la preferencia guardada contra la preferencia del sistema.
 * @param preference - Preferencia guardada por la persona.
 * @param prefersDark - Si el sistema prefiere un tema oscuro.
 * @returns El tema que debe aplicarse.
 */
export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  return preference === "dark" || (preference === "system" && prefersDark) ? "dark" : "light";
}

/**
 * Aplica el tema resuelto al documento.
 * @param theme - Tema que debe aplicarse al elemento raíz.
 */
export function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

/** Evita el destello de tema claro antes de que hidrate React. */
export const THEME_INIT_SCRIPT = `(function(){try{var key="${THEME_STORAGE_KEY}";var saved=localStorage.getItem(key);var preference=saved==="light"||saved==="dark"||saved==="system"?saved:"system";var dark=preference==="dark"||(preference==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=dark?"dark":"light";document.documentElement.style.colorScheme=dark?"dark":"light"}catch(e){}})();`;
