/** Formatos Office admitidos por el visor. */
export type OfficeFormat = "docx" | "xlsx" | "pptx";

/** Metadatos del archivo local validado. */
export type OfficeFileInfo = {
  name: string;
  size: number;
  format: OfficeFormat;
};

/** Límite de tamaño para no bloquear la ventana con archivos desproporcionados. */
export const MAX_OFFICE_FILE_BYTES = 30 * 1024 * 1024;

/** Extensiones que acepta el selector del sistema. */
export const OFFICE_FILE_ACCEPT = ".docx,.xlsx,.pptx";

const FORMAT_LABELS: Record<OfficeFormat, string> = {
  docx: "Documento de Word",
  xlsx: "Hoja de Excel",
  pptx: "Presentación de PowerPoint",
};

/**
 * Deduce el formato a partir de la extensión del archivo.
 * @param name - Nombre original del archivo.
 * @returns El formato admitido o `null`.
 */
export function detectOfficeFormat(name: string): OfficeFormat | null {
  const match = /\.(docx|xlsx|pptx)$/i.exec(name.trim());
  return match ? match[1].toLowerCase() as OfficeFormat : null;
}

/**
 * Nombre legible del formato.
 * @param format - Formato validado.
 * @returns La etiqueta para la ficha del archivo.
 */
export function officeFormatLabel(format: OfficeFormat): string {
  return FORMAT_LABELS[format];
}

/**
 * Convierte bytes en una medida breve.
 * @param bytes - Tamaño del archivo.
 * @returns Texto con KB o MB.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

/**
 * Valida un archivo local antes de leerlo.
 * @param file - Archivo del selector.
 * @returns Los metadatos o un mensaje de error.
 */
export function validateOfficeFile(file: { name: string; size: number }): { file: OfficeFileInfo } | { error: string } {
  const format = detectOfficeFormat(file.name);
  if (!format) {
    return { error: "Elige un archivo .docx, .xlsx o .pptx." };
  }
  if (file.size <= 0) {
    return { error: "El archivo está vacío." };
  }
  if (file.size > MAX_OFFICE_FILE_BYTES) {
    return { error: `El archivo supera el límite de ${formatFileSize(MAX_OFFICE_FILE_BYTES)}.` };
  }
  return { file: { name: file.name, size: file.size, format } };
}

/**
 * Traduce los errores conocidos del visor a mensajes de aula.
 * @param error - Error del lector o de la librería.
 * @returns Un mensaje seguro para mostrar.
 */
export function officeErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  if (code === "encrypted" || code === "invalid-password" || code === "unsupported-encryption") {
    return "El archivo está protegido con contraseña y esta versión no puede abrirlo.";
  }
  if (code === "legacy-binary-format") {
    return "Este visor solo admite .docx, .xlsx y .pptx; los formatos antiguos no están soportados.";
  }
  if (code === "not-ooxml") {
    return "El archivo no parece un documento de Office válido.";
  }
  if (code === "unsupported-content") {
    return "El documento contiene contenido que este visor todavía no puede mostrar.";
  }
  if (code === "ooxml-resource-limit" || code === "ooxml-decoded-image-limit") {
    return "El documento es demasiado complejo para abrirlo con seguridad en esta ventana.";
  }
  return "No se pudo abrir el documento. Comprueba que el archivo no esté dañado.";
}
