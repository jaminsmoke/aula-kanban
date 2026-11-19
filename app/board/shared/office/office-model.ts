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
    return { error: "Solo se admiten archivos .docx, .xlsx y .pptx. Los formatos .doc, .xls y .ppt no se pueden abrir." };
  }
  if (file.size <= 0) {
    return { error: "El archivo está vacío o no se puede leer." };
  }
  if (file.size > MAX_OFFICE_FILE_BYTES) {
    return { error: `El archivo ocupa ${formatFileSize(file.size)} y supera el límite de ${formatFileSize(MAX_OFFICE_FILE_BYTES)}. Elige uno más pequeño.` };
  }
  return { file: { name: file.name, size: file.size, format } };
}

/**
 * Extrae el código de un error del visor, incluidos los errores de imagen que solo traen métricas.
 * @param error - Error del lector o de la librería.
 * @returns El código conocido o una cadena vacía.
 */
function officeErrorCode(error: unknown): string {
  return officeErrorCodeAt(error, 0);
}

/**
 * Recorre causas anidadas sin seguir ciclos.
 * @param error - Error candidato.
 * @param depth - Profundidad actual.
 * @returns El código conocido o una cadena vacía.
 */
function officeErrorCodeAt(error: unknown, depth: number): string {
  if (typeof error !== "object" || error === null || depth > 2) return "";
  if ("code" in error && typeof (error as { code?: unknown }).code === "string" && (error as { code: string }).code) {
    return (error as { code: string }).code;
  }
  if ("metric" in error && "limit" in error && "observed" in error) {
    return "ooxml-decoded-image-limit";
  }
  const cause = "cause" in error ? (error as { cause?: unknown }).cause : null;
  return cause && cause !== error ? officeErrorCodeAt(cause, depth + 1) : "";
}

/**
 * Traduce los errores conocidos del visor a mensajes de aula.
 * @param error - Error del lector o de la librería.
 * @returns Un mensaje seguro para mostrar.
 */
export function officeErrorMessage(error: unknown): string {
  const code = officeErrorCode(error);
  if (code === "encrypted" || code === "invalid-password" || code === "unsupported-encryption") {
    return "El archivo está protegido con contraseña. Esta versión no puede abrir documentos cifrados.";
  }
  if (code === "legacy-binary-format") {
    return "El archivo usa un formato antiguo de Office (.doc, .xls o .ppt). Guárdalo como .docx, .xlsx o .pptx para abrirlo.";
  }
  if (code === "not-ooxml") {
    return "El archivo no parece un documento de Office válido. Puede estar dañado o tener otra extensión.";
  }
  if (code === "unsupported-content" || code === "unsupported-image-effect" || code === "invalid-numbering" || code === "ooxml-tiff-decode") {
    return "El documento contiene elementos que este visor todavía no puede mostrar. Prueba a abrirlo en su aplicación original.";
  }
  if (code === "ooxml-resource-limit") {
    return "El documento es demasiado grande o complejo para abrirlo con seguridad en esta ventana.";
  }
  if (code === "ooxml-decoded-image-limit") {
    return "El documento contiene imágenes demasiado grandes para mostrarlas con seguridad.";
  }
  if (code === "font-source-limit") {
    return "El documento requiere demasiadas fuentes externas para mostrarse con seguridad.";
  }
  return "No se pudo abrir el documento. Comprueba que no esté dañado y que sea un archivo de Office compatible.";
}
