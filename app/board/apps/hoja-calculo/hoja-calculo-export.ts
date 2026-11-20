import { downloadBlob } from "../../shared/ui/download";
import { toCsv, type SpreadsheetDocument } from "./hoja-calculo-model";

/**
 * Descarga una hoja de cálculo como CSV.
 * @param document - Documento serializable que se quiere exportar.
 */
export function downloadSheetCsv(document: SpreadsheetDocument): void {
  downloadBlob(
    new Blob([toCsv(document.data)], { type: "text/csv;charset=utf-8;" }),
    "hoja-calculo.csv",
  );
}
