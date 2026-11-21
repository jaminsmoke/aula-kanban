/** Definición central de un atajo de Aula Documentos. */
export type AulaShortcut = {
  id: string;
  label: string;
  keys: string[];
  combo: string;
  scope: "app" | "editor" | "context";
  description: string;
  intercept: boolean;
};

/**
 * Mapa único de atajos de Aula Documentos.
 * `intercept: false` documenta atajos del editor o del navegador que no se
 * capturan en el manejador global.
 */
export const AULA_SHORTCUTS: readonly AulaShortcut[] = [
  { id: "save", label: "Guardar", keys: ["Ctrl/Cmd", "S"], combo: "mod+s", scope: "app", description: "guardar", intercept: true },
  { id: "search", label: "Buscar", keys: ["Ctrl/Cmd", "F"], combo: "mod+f", scope: "app", description: "buscar", intercept: true },
  { id: "replace", label: "Reemplazar", keys: ["Ctrl/Cmd", "H"], combo: "mod+h", scope: "app", description: "reemplazar", intercept: true },
  { id: "outline", label: "Esquema", keys: ["Ctrl/Cmd", "Shift", "O"], combo: "mod+shift+o", scope: "app", description: "mostrar u ocultar el esquema", intercept: true },
  { id: "focus", label: "Enfoque", keys: ["Alt", "Shift", "F"], combo: "alt+shift+f", scope: "app", description: "alternar el modo enfoque", intercept: true },
  { id: "comments", label: "Comentarios", keys: ["Ctrl/Cmd", "Alt", "M"], combo: "mod+alt+m", scope: "app", description: "mostrar u ocultar comentarios", intercept: true },
  { id: "bold", label: "Negrita", keys: ["Ctrl/Cmd", "B"], combo: "mod+b", scope: "editor", description: "negrita", intercept: false },
  { id: "italic", label: "Cursiva", keys: ["Ctrl/Cmd", "I"], combo: "mod+i", scope: "editor", description: "cursiva", intercept: false },
  { id: "link", label: "Enlace", keys: ["Ctrl/Cmd", "K"], combo: "mod+k", scope: "editor", description: "enlace", intercept: false },
  { id: "heading-1", label: "Título 1", keys: ["Ctrl", "Alt", "1"], combo: "ctrl+alt+1", scope: "editor", description: "título 1", intercept: false },
  { id: "heading-2", label: "Título 2", keys: ["Ctrl", "Alt", "2"], combo: "ctrl+alt+2", scope: "editor", description: "título 2", intercept: false },
  { id: "heading-3", label: "Título 3", keys: ["Ctrl", "Alt", "3"], combo: "ctrl+alt+3", scope: "editor", description: "título 3", intercept: false },
  { id: "search-next", label: "Siguiente resultado", keys: ["Enter"], combo: "enter", scope: "context", description: "siguiente resultado", intercept: false },
  { id: "search-previous", label: "Resultado anterior", keys: ["Shift", "Enter"], combo: "shift+enter", scope: "context", description: "resultado anterior", intercept: false },
  { id: "escape", label: "Cerrar", keys: ["Escape"], combo: "escape", scope: "context", description: "cerrar búsqueda, diálogo o enfoque", intercept: false },
  { id: "table-next", label: "Siguiente celda", keys: ["Tab"], combo: "tab", scope: "editor", description: "avanzar en una tabla", intercept: false },
  { id: "table-previous", label: "Celda anterior", keys: ["Shift", "Tab"], combo: "shift+tab", scope: "editor", description: "retroceder en una tabla", intercept: false },
  { id: "mermaid-apply", label: "Aplicar Mermaid", keys: ["Ctrl/Cmd", "Enter"], combo: "mod+enter", scope: "editor", description: "aplicar el código de un diagrama", intercept: false },
];

/**
 * Busca un atajo por id.
 * @param id - Identificador estable.
 * @returns La definición o `undefined`.
 */
function getAulaShortcut(id: string): AulaShortcut | undefined {
  return AULA_SHORTCUTS.find((shortcut) => shortcut.id === id);
}

/**
 * Comprueba si un evento corresponde a un atajo interceptable.
 * @param event - Evento de teclado.
 * @param id - Identificador del atajo.
 * @returns `true` si coincide.
 */
export function matchesAulaShortcut(event: KeyboardEvent, id: string): boolean {
  const shortcut = getAulaShortcut(id);
  if (!shortcut || !shortcut.intercept) return false;
  const command = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  const parts = shortcut.combo.split("+");
  const expectedKey = parts.at(-1);
  if (expectedKey !== key) return false;
  return command === parts.includes("mod")
    && event.altKey === parts.includes("alt")
    && event.shiftKey === parts.includes("shift");
}
