"use client";

import { AULA_SHORTCUTS, type AulaShortcut } from "./atajos/shortcuts";

const SHORTCUT_SCOPES = [
  { id: "app", label: "Aplicación" },
  { id: "editor", label: "Editor" },
  { id: "context", label: "Contexto" },
] as const;

/**
 * Texto de ayuda de la suite documental.
 * @returns Los párrafos informativos del panel lateral.
 */
export function AulaDocumentosHelp() {
  return (
    <>
      <p>Aula Documentos reúne notas, imágenes, tablas, diagramas, presentaciones y Office. Escribe el documento, usa <strong>Insertar &gt; Insertar imagen</strong> para añadir una imagen local y <strong>Diagrama</strong> para insertar un bloque Mermaid. El bloque se mueve con el contenido y se exporta como SVG. <strong>Insertar &gt; Insertar tabla</strong> permite elegir el tamaño; dentro de la tabla puedes alternar cabeceras, combinar o dividir celdas y recorrerla con Tab/Shift+Tab. El documento se guarda automáticamente tras una pausa. La presentación se puede editar por diapositivas o desde <strong>Fuente Markdown</strong>. En pantalla completa, <strong>Presentador</strong> muestra las notas y la siguiente diapositiva.</p>
      <p>Las imágenes se incrustan en HTML, presentación, impresión/PDF, DOCX y PPTX con texto alternativo y pie; si falla un recurso, se avisa. <strong>Archivo &gt; Copias portables</strong> guarda o descarga una copia completa; <strong>Importar &gt; Importar copia</strong> la restaura. <strong>Importar &gt; Importar documento</strong> admite Markdown, TXT, JSON y DOCX/PPTX con arrastre o pegado; avisa antes de reemplazar.</p>
      <p>Las apps documentales anteriores siguen guardando sus datos. Usa <strong>Importar &gt; Migrar apps antiguas</strong> para reunirlos aquí; la migración conserva copias y se puede deshacer.</p>
    </>
  );
}

/**
 * Pinta las teclas de un atajo.
 * @param shortcut - Definición central del atajo.
 * @returns Las teclas separadas por `+`.
 */
function ShortcutKeys({ shortcut }: { shortcut: AulaShortcut }) {
  return (
    <>
      {shortcut.keys.map((key, index) => (
        <span key={`${shortcut.id}-${key}`}>
          {index > 0 ? " + " : null}
          <kbd>{key}</kbd>
        </span>
      ))}
    </>
  );
}

/**
 * Lista de atajos de teclado del editor.
 * @returns El contenido de la sección de atajos, generado desde el mapa central.
 */
export function AulaDocumentosShortcuts() {
  return (
    <>
      <h3>Atajos</h3>
      {SHORTCUT_SCOPES.map((scope) => {
        const shortcuts = AULA_SHORTCUTS.filter((shortcut) => shortcut.scope === scope.id);
        return (
          <section className="aula-documentos-shortcut-group" aria-labelledby={`aula-atajos-${scope.id}`} key={scope.id}>
            <h4 id={`aula-atajos-${scope.id}`}>{scope.label}</h4>
            <ul>
              {shortcuts.map((shortcut) => (
                <li key={shortcut.id}>
                  <ShortcutKeys shortcut={shortcut} /> {shortcut.description}.
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
