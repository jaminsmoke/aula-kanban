"use client";

/**
 * Texto de ayuda de la suite documental.
 * @returns Los párrafos informativos del panel lateral.
 */
export function AulaDocumentosHelp() {
  return (
    <>
      <p>Aula Documentos reúne notas, imágenes, tablas, diagramas, presentaciones y Office. Escribe el documento, usa <strong>Insertar &gt; Insertar imagen</strong> para añadir una imagen local y <strong>Diagrama</strong> para insertar un bloque Mermaid. El bloque se mueve con el contenido y se exporta como SVG. <strong>Insertar &gt; Insertar tabla</strong> permite elegir el tamaño; dentro de la tabla puedes alternar cabeceras, combinar o dividir celdas y recorrerla con Tab/Shift+Tab. El documento se guarda automáticamente tras una pausa. La presentación se puede editar por diapositivas o desde <strong>Fuente Markdown</strong>.</p>
      <p>Las imágenes se incrustan en HTML, presentación, impresión/PDF, DOCX y PPTX con texto alternativo y pie; si falla un recurso, se avisa. <strong>Archivo &gt; Copias portables</strong> guarda o descarga una copia completa; <strong>Importar &gt; Importar copia</strong> la restaura. También puedes importar y exportar DOCX/PPTX y abrir archivos de Office en el visor; XLSX: Visor Office.</p>
      <p>Las apps documentales anteriores siguen guardando sus datos. Usa <strong>Importar &gt; Migrar apps antiguas</strong> para reunirlos aquí; la migración conserva copias y se puede deshacer.</p>
    </>
  );
}

/**
 * Lista de atajos de teclado del editor.
 * @returns El contenido de la sección de atajos.
 */
export function AulaDocumentosShortcuts() {
  return (
    <>
      <h3>Atajos</h3>
      <ul>
        <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>B</kbd> negrita</li>
        <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>I</kbd> cursiva</li>
        <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd> enlace</li>
        <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>S</kbd> guardar</li>
        <li><kbd>Tab</kbd>/<kbd>Shift</kbd> + <kbd>Tab</kbd> avanzar o retroceder en una tabla.</li>
        <li>En un diagrama, <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Intro</kbd> aplica el código.</li>
      </ul>
    </>
  );
}
