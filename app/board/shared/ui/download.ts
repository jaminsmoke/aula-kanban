/**
 * Descarga un Blob mediante un enlace temporal.
 * @param blob - Contenido descargable.
 * @param name - Nombre del archivo.
 */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Descarga un archivo de texto.
 * @param contents - Contenido.
 * @param type - MIME.
 * @param name - Nombre del archivo.
 */
export function downloadTextFile(contents: string, type: string, name: string) {
  downloadBlob(new Blob([contents], { type }), name);
}
