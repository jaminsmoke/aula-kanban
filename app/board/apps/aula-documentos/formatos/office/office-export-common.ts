/** Resultado de una exportación Office. */
export type OfficeExportResult = {
  blob: Blob;
  warnings: string[];
};

/**
 * Añade un aviso sin duplicarlo.
 * @param warnings - Lista de avisos.
 * @param warning - Aviso que se quiere añadir.
 */
export function addWarning(warnings: string[], warning: string) {
  if (!warnings.includes(warning)) warnings.push(warning);
}
