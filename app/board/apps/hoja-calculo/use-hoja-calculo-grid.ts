"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import jspreadsheet from "jspreadsheet-ce";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import { downloadSheetCsv } from "./hoja-calculo-export";
import {
  buildFormulaSheet,
  calculateSheet,
  extractFormulaMap,
  formulaCellKey,
  type SheetCalculationSummary,
} from "./hoja-calculo-calc";
import {
  SHEET_COLUMNS,
  SHEET_HEADERS,
  SHEET_ROWS,
  STARTER_SHEET,
  cloneSheet,
  normalizeSheet,
  selectionToRange,
  type SpreadsheetCell,
  type SpreadsheetDocument,
} from "./hoja-calculo-model";

type Worksheet = jspreadsheet.WorksheetInstance;

type CellPosition = {
  row: number;
  column: number;
};

type UseHojaCalculoGridOptions = {
  containerRef: RefObject<HTMLDivElement | null>;
  initialDocument: SpreadsheetDocument;
  pendingDocument: SpreadsheetDocument | null;
  readOnly: boolean;
  onDocumentChange: (document: SpreadsheetDocument) => void;
  onPendingDocumentConsumed: () => void;
  onDirty: () => void;
  onStatus: (message: string) => void;
  onSave: (document: SpreadsheetDocument) => Promise<boolean>;
};

/**
 * Ciclo de vida de jspreadsheet, cálculo y acciones de la rejilla.
 * @param options - Documento inicial, estado pendiente y callbacks de persistencia.
 * @returns Referencia del contenedor, estado de cálculo y acciones de la hoja.
 */
export function useHojaCalculoGrid({
  containerRef,
  initialDocument,
  pendingDocument,
  readOnly,
  onDocumentChange,
  onPendingDocumentConsumed,
  onDirty,
  onStatus,
  onSave,
}: UseHojaCalculoGridOptions) {
  const worksheetRef = useRef<Worksheet | null>(null);
  const initialDataRef = useRef(cloneSheet(initialDocument.data));
  const initialStylesRef = useRef(initialDocument.styles);
  const formulasRef = useRef(extractFormulaMap(STARTER_SHEET));
  const applyingRef = useRef(false);
  const [initialCalculation] = useState(() => calculateSheet(STARTER_SHEET));
  const initialDisplay = initialCalculation.display;
  const [ready, setReady] = useState(false);
  const [calculation, setCalculation] = useState<SheetCalculationSummary>(initialCalculation.summary);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [formulaDraft, setFormulaDraft] = useState("");
  const [initError, setInitError] = useState<string | null>(null);

  /**
   * Aplica datos y estilos a una instancia de la rejilla.
   * @param document - Documento que se muestra.
   * @param worksheet - Rejilla de destino.
   */
  const applyWorksheet = useCallback((document: SpreadsheetDocument, worksheet: Worksheet) => {
    const currentStyles = worksheet.getStyle() as Record<string, string>;
    if (Object.keys(currentStyles).length) worksheet.resetStyle(currentStyles);
    const data = normalizeSheet(document.data);
    formulasRef.current = extractFormulaMap(data);
    const nextCalculation = calculateSheet(data);
    applyingRef.current = true;
    try {
      worksheet.setData(nextCalculation.display);
      if (document.styles && Object.keys(document.styles).length) {
        worksheet.setStyle(document.styles);
      }
    } finally {
      applyingRef.current = false;
    }
    setCalculation(nextCalculation.summary);
    setSelectedCell(null);
    setFormulaDraft("");
  }, []);

  useEffect(() => {
    if (!ready || !pendingDocument) return;
    const worksheet = worksheetRef.current;
    if (!worksheet) return;
    applyWorksheet(pendingDocument, worksheet);
    onPendingDocumentConsumed();
  }, [applyWorksheet, onPendingDocumentConsumed, pendingDocument, ready]);

  /**
   * Lee el texto visible de una celda de la rejilla.
   * @param worksheet - Rejilla consultada.
   * @param row - Fila cero-based.
   * @param column - Columna cero-based.
   * @returns El valor visible como texto.
   */
  function cellText(worksheet: Worksheet, row: number, column: number): string {
    const value = worksheet.getValueFromCoords(column, row);
    return value === null || value === undefined ? "" : String(value);
  }

  /**
   * Recalcula la rejilla y guarda las fórmulas originales en el estado.
   * @param worksheet - Rejilla que se está editando.
   * @param message - Mensaje de estado.
   */
  const recalculate = useCallback((worksheet: Worksheet, message: string) => {
    const display = normalizeSheet(worksheet.getData() as SpreadsheetCell[][]);
    const data = buildFormulaSheet(display, formulasRef.current);
    const nextCalculation = calculateSheet(data);
    const calculated = nextCalculation.display;
    applyingRef.current = true;
    try {
      calculated.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
        if (display[rowIndex]?.[columnIndex] !== value) {
          worksheet.setValueFromCoords(columnIndex, rowIndex, value, true);
        }
      }));
    } finally {
      applyingRef.current = false;
    }
    setCalculation(nextCalculation.summary);
    onDocumentChange({
      data,
      styles: worksheet.getStyle() as Record<string, string>,
    });
    onDirty();
    onStatus(message);
  }, [onDocumentChange, onDirty, onStatus]);

  /**
   * Aplica el texto de la barra de fórmulas a la celda seleccionada.
   */
  function commitFormula() {
    const worksheet = worksheetRef.current;
    if (!worksheet || readOnly || !selectedCell) return;
    const value = formulaDraft.trim();
    const key = formulaCellKey(selectedCell.row, selectedCell.column);
    const current = formulasRef.current.get(key) ?? cellText(worksheet, selectedCell.row, selectedCell.column);
    if (value === current) return;
    if (value.startsWith("=")) {
      formulasRef.current.set(key, value);
    } else {
      formulasRef.current.delete(key);
      applyingRef.current = true;
      try {
        worksheet.setValueFromCoords(selectedCell.column, selectedCell.row, value, true);
      } finally {
        applyingRef.current = false;
      }
    }
    recalculate(worksheet, "Fórmula actualizada.");
    setFormulaDraft(formulasRef.current.get(key) ?? value);
  }

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let active = true;

    try {
      jspreadsheet(element, {
        // Las hojas compartidas se cargan como datos. El motor de fórmulas
        // de esta versión de Jspreadsheet ejecuta expresiones como JavaScript.
        parseFormulas: false,
        parseHTML: false,
        worksheets: [
          {
            data: initialDisplay,
            minDimensions: [SHEET_COLUMNS, SHEET_ROWS],
            columns: SHEET_HEADERS.map((title, index) => ({
              title,
              width: index === 0 ? 160 : 100,
              type: index === 1 || index === 2 || index === 3 ? "numeric" : "text",
            })),
            editable: !readOnly,
            tableOverflow: true,
            tableHeight: "100%",
          },
        ],
        toolbar: false,
        onload: (instance) => {
          if (!active) return;
          const worksheet = instance.worksheets[0] ?? null;
          worksheetRef.current = worksheet;
          if (worksheet) {
            applyWorksheet({
              data: initialDataRef.current,
              styles: initialStylesRef.current,
            }, worksheet);
          }
          setReady(true);
        },
        onchange: (instance, _cell, columnIndex, rowIndex, newValue) => {
          if (!active || applyingRef.current) return;
          const row = Number(rowIndex);
          const column = Number(columnIndex);
          const key = formulaCellKey(row, column);
          if (typeof newValue === "string" && newValue.trimStart().startsWith("=")) {
            formulasRef.current.set(key, newValue);
            setFormulaDraft(newValue);
          } else {
            formulasRef.current.delete(key);
            setFormulaDraft(newValue === null || newValue === undefined ? "" : String(newValue));
          }
          setSelectedCell({ row, column });
          recalculate(instance, "Hoja modificada.");
        },
        onselection: (instance, left, top) => {
          if (!active || applyingRef.current) return;
          const row = Number(top);
          const column = Number(left);
          const formula = formulasRef.current.get(formulaCellKey(row, column));
          const value = instance.getValueFromCoords(column, row);
          setSelectedCell({ row, column });
          setFormulaDraft(formula ?? (value === null || value === undefined ? "" : String(value)));
        },
        onchangestyle: (instance) => {
          if (!active || applyingRef.current) return;
          recalculate(instance, "Formato actualizado.");
        },
      });
    } catch {
      window.setTimeout(() => {
        if (active) {
          setInitError("No se pudo iniciar la hoja de cálculo. Recarga la página para intentarlo de nuevo.");
        }
      }, 0);
    }

    return () => {
      active = false;
      jspreadsheet.destroy?.(element as jspreadsheet.JspreadsheetInstanceElement);
      element.replaceChildren();
      worksheetRef.current = null;
    };
  }, [applyWorksheet, containerRef, initialDisplay, readOnly, recalculate]);

  /**
   * Sincroniza la hoja después de una acción de la barra.
   * @param message - Mensaje que se muestra en la barra de estado.
   */
  function syncDocument(message: string) {
    const worksheet = worksheetRef.current;
    if (!worksheet) return;
    recalculate(worksheet, message);
  }

  /**
   * Inserta una fila al final de la hoja.
   */
  function addRow() {
    const worksheet = worksheetRef.current;
    if (!worksheet || readOnly) return;
    worksheet.insertRow();
    syncDocument("Fila añadida.");
  }

  /**
   * Inserta una columna al final de la hoja.
   */
  function addColumn() {
    const worksheet = worksheetRef.current;
    if (!worksheet || readOnly) return;
    worksheet.insertColumn();
    syncDocument("Columna añadida.");
  }

  /**
   * Aplica un estilo CSS a la selección actual.
   * @param property - Propiedad CSS.
   * @param value - Valor CSS.
   * @param message - Mensaje de estado.
   */
  function applyStyle(property: string, value: string, message: string) {
    const worksheet = worksheetRef.current;
    if (!worksheet || readOnly) return;
    worksheet.setStyle(selectionToRange(worksheet.getSelection()), property, value);
    syncDocument(message);
  }

  /**
   * Quita el formato esencial de la selección actual.
   */
  function clearFormat() {
    const worksheet = worksheetRef.current;
    if (!worksheet || readOnly) return;
    const range = selectionToRange(worksheet.getSelection());
    worksheet.setStyle(range, "font-weight", "");
    worksheet.setStyle(range, "font-style", "");
    worksheet.setStyle(range, "text-align", "");
    syncDocument("Formato retirado.");
  }

  /**
   * Reinicia la hoja al ejemplo inicial.
   */
  function resetSheet() {
    const worksheet = worksheetRef.current;
    if (!worksheet || readOnly) return;
    const starter = cloneSheet(STARTER_SHEET);
    applyWorksheet({ data: starter, styles: {} }, worksheet);
    onDocumentChange({ data: starter, styles: {} });
    onDirty();
    onStatus("Hoja reiniciada con el ejemplo.");
  }

  /**
   * Construye el documento actual desde la rejilla.
   * @returns El documento serializable o `null` si la rejilla no está lista.
   */
  function currentDocument(): SpreadsheetDocument | null {
    const worksheet = worksheetRef.current;
    if (!worksheet) return null;
    return {
      data: buildFormulaSheet(
        normalizeSheet(worksheet.getData() as SpreadsheetCell[][]),
        formulasRef.current,
      ),
      styles: worksheet.getStyle() as Record<string, string>,
    };
  }

  /**
   * Guarda la hoja y su formato en el proyecto.
   */
  async function saveSheet() {
    const document = currentDocument();
    if (!document) return;
    await onSave(document);
  }

  /**
   * Descarga la hoja actual en CSV.
   */
  function exportCsv() {
    const document = currentDocument();
    if (!document) return;
    downloadSheetCsv(document);
    onStatus("CSV descargado.");
  }

  return {
    ready,
    initError,
    calculation,
    selectedCell,
    formulaDraft,
    setFormulaDraft,
    commitFormula,
    addRow,
    addColumn,
    applyStyle,
    clearFormat,
    resetSheet,
    saveSheet,
    exportCsv,
  };
}
