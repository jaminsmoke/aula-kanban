"use client";

import { useEffect, useRef, useState } from "react";
import jspreadsheet from "jspreadsheet-ce";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  Download,
  Eraser,
  FolderOpen,
  Italic,
  RotateCcw,
  Rows3,
  Save,
  Sheet,
} from "lucide-react";
import type { StoreRole } from "../types";
import { useAppDocument } from "../use-app-document";
import { downloadBlob } from "../../shared/ui/download";
import {
  buildFormulaSheet,
  calculateSheet,
  extractFormulaMap,
  formulaCellKey,
  type SheetCalculationSummary,
} from "./hoja-calculo-calc";
import type { FormulaLimit } from "./hoja-calculo-formula";
import {
  SHEET_COLUMNS,
  SHEET_HEADERS,
  SHEET_ROWS,
  STARTER_SHEET,
  cloneSheet,
  normalizeSheet,
  parseSpreadsheetDocument,
  selectionToRange,
  toCsv,
  type SpreadsheetCell,
  type SpreadsheetDocument,
} from "./hoja-calculo-model";
import "./hoja-calculo.css";

type Worksheet = jspreadsheet.WorksheetInstance;

const LIMIT_LABELS: Record<FormulaLimit, string> = {
  formulaLength: "fórmula demasiado larga",
  rangeCells: "rango demasiado grande",
  depth: "cadena de dependencias demasiado profunda",
};

/**
 * Hoja de cálculo con celdas, formato y persistencia por proyecto.
 * @param props - Proyecto activo y rol del usuario.
 * @returns La ventana con la rejilla y la barra de herramientas.
 */
export default function HojaCalculoApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const worksheetRef = useRef<Worksheet | null>(null);
  const [documentValue, setDocumentValue] = useState<SpreadsheetDocument>(() => ({ data: cloneSheet(STARTER_SHEET) }));
  const initialDataRef = useRef(documentValue.data);
  const [initialCalculation] = useState(() => calculateSheet(STARTER_SHEET));
  const initialDisplay = initialCalculation.display;
  const initialStylesRef = useRef(documentValue.styles);
  const pendingDocumentRef = useRef<SpreadsheetDocument | null>(null);
  const formulasRef = useRef(extractFormulaMap(STARTER_SHEET));
  const applyingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Hoja de ejemplo lista.");
  const [calculation, setCalculation] = useState<SheetCalculationSummary>(initialCalculation.summary);
  const [selectedCell, setSelectedCell] = useState<{ row: number; column: number } | null>(null);
  const [formulaDraft, setFormulaDraft] = useState("");
  const [initError, setInitError] = useState<string | null>(null);
  const { load, save, loading, error } = useAppDocument<SpreadsheetDocument>(projectId, "hoja-calculo");
  const readOnly = role === "guest";

  /**
   * Aplica datos y estilos a una instancia de la rejilla.
   * @param document - Documento que se muestra.
   * @param worksheet - Rejilla de destino.
   */
  function applyWorksheet(document: SpreadsheetDocument, worksheet: Worksheet) {
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
  }

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

  /**
   * Recalcula la rejilla y guarda las fórmulas originales en el estado.
   * @param worksheet - Rejilla que se está editando.
   * @param message - Mensaje de estado.
   */
  function recalculate(worksheet: Worksheet, message: string) {
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
    setDocumentValue({
      data,
      styles: worksheet.getStyle() as Record<string, string>,
    });
    setDirty(true);
    setStatus(message);
  }

  useEffect(() => {
    let active = true;
    void load().then(({ state }) => {
      if (!active) return;
      const parsed = parseSpreadsheetDocument(state);
      if (parsed) {
        setDocumentValue(parsed);
        pendingDocumentRef.current = parsed;
        const worksheet = worksheetRef.current;
        if (worksheet) applyWorksheet(parsed, worksheet);
        setDirty(false);
        setStatus("Hoja guardada cargada.");
      } else {
        setStatus("Hoja de ejemplo lista. Guarda para conservarla.");
      }
    });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    const element = gridRef.current;
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
            applyWorksheet(pendingDocumentRef.current ?? {
              data: initialDataRef.current,
              styles: initialStylesRef.current,
            }, worksheet);
            if (pendingDocumentRef.current) setDirty(false);
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
  }, [readOnly, initialDisplay]);

  /**
   * Aplica un documento validado y, si la rejilla ya existe, lo pinta.
   * @param document - Documento que se muestra.
   * @param message - Mensaje de estado.
   */
  function applyDocument(document: SpreadsheetDocument, message: string) {
    setDocumentValue(document);
    pendingDocumentRef.current = document;
    const worksheet = worksheetRef.current;
    if (worksheet) applyWorksheet(document, worksheet);
    setDirty(false);
    setStatus(message);
  }

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
    setDocumentValue({ data: starter, styles: {} });
    setDirty(true);
    setStatus("Hoja reiniciada con el ejemplo.");
  }

  /**
   * Guarda la hoja y su formato en el proyecto.
   */
  async function saveSheet() {
    if (readOnly) return;
    setSaving(true);
    const worksheet = worksheetRef.current;
    const document = worksheet
      ? {
        data: buildFormulaSheet(
          normalizeSheet(worksheet.getData() as SpreadsheetCell[][]),
          formulasRef.current,
        ),
        styles: worksheet.getStyle() as Record<string, string>,
      }
      : documentValue;
    const ok = await save(document);
    setSaving(false);
    if (ok) {
      setDirty(false);
      setStatus("Hoja guardada en el proyecto.");
    } else {
      setStatus("No se pudo guardar la hoja. Revisa la conexión.");
    }
  }

  /**
   * Vuelve a cargar la hoja guardada.
   */
  async function reloadSheet() {
    const { state } = await load();
    const parsed = parseSpreadsheetDocument(state);
    if (parsed) {
      applyDocument(parsed, "Hoja guardada cargada.");
    } else {
      setStatus("No hay una hoja guardada válida; se mantiene la actual.");
    }
  }

  /**
   * Descarga la hoja actual en CSV.
   */
  function exportCsv() {
    const worksheet = worksheetRef.current;
    if (!worksheet) return;
    const data = buildFormulaSheet(
      normalizeSheet(worksheet.getData() as SpreadsheetCell[][]),
      formulasRef.current,
    );
    downloadBlob(new Blob([toCsv(data)], { type: "text/csv;charset=utf-8;" }), "hoja-calculo.csv");
    setStatus("CSV descargado.");
  }

  const displayStatus = loading
    ? "Cargando hoja…"
    : error ?? status;
  const statusText = dirty && !loading && !error
    ? `${displayStatus} Cambios sin guardar.`
    : displayStatus;
  const errorCount = calculation.errors.length;
  const limitLabels = [...new Set(calculation.errors.flatMap((entry) => (
    entry.limit ? [LIMIT_LABELS[entry.limit]] : []
  )))];

  return (
    <div className="hoja-calculo-app">
      <header className="hoja-calculo-toolbar">
        <div className="hoja-calculo-heading">
          <span className="hoja-calculo-mark" aria-hidden>
            <Sheet size={18} strokeWidth={2} />
          </span>
          <span>
            <strong>Hoja de cálculo</strong>
            <small>Celdas y formato</small>
          </span>
        </div>
        <div className="hoja-calculo-actions" role="group" aria-label="Herramientas de la hoja">
          <button type="button" onClick={addRow} disabled={!ready || readOnly} aria-label="Añadir fila">
            <Rows3 size={15} aria-hidden />
            <span>Fila</span>
          </button>
          <button type="button" onClick={addColumn} disabled={!ready || readOnly} aria-label="Añadir columna">
            <Columns3 size={15} aria-hidden />
            <span>Columna</span>
          </button>
          <button type="button" onClick={() => applyStyle("font-weight", "bold", "Negrita aplicada.")} disabled={!ready || readOnly} aria-label="Negrita">
            <Bold size={15} aria-hidden />
            <span>Negrita</span>
          </button>
          <button type="button" onClick={() => applyStyle("font-style", "italic", "Cursiva aplicada.")} disabled={!ready || readOnly} aria-label="Cursiva">
            <Italic size={15} aria-hidden />
            <span>Cursiva</span>
          </button>
          <button type="button" onClick={() => applyStyle("text-align", "left", "Alineación izquierda.")} disabled={!ready || readOnly} aria-label="Alinear a la izquierda">
            <AlignLeft size={15} aria-hidden />
          </button>
          <button type="button" onClick={() => applyStyle("text-align", "center", "Alineación centrada.")} disabled={!ready || readOnly} aria-label="Centrar">
            <AlignCenter size={15} aria-hidden />
          </button>
          <button type="button" onClick={() => applyStyle("text-align", "right", "Alineación derecha.")} disabled={!ready || readOnly} aria-label="Alinear a la derecha">
            <AlignRight size={15} aria-hidden />
          </button>
          <button type="button" onClick={clearFormat} disabled={!ready || readOnly} aria-label="Limpiar formato">
            <Eraser size={15} aria-hidden />
            <span>Limpiar</span>
          </button>
          <button type="button" onClick={exportCsv} disabled={!ready} aria-label="Exportar CSV">
            <Download size={15} aria-hidden />
            <span>CSV</span>
          </button>
          <button type="button" onClick={reloadSheet} disabled={loading} aria-label="Cargar hoja">
            <FolderOpen size={15} aria-hidden />
            <span>Cargar</span>
          </button>
          <button type="button" onClick={saveSheet} disabled={!ready || readOnly || saving || loading} aria-label="Guardar hoja">
            <Save size={15} aria-hidden />
            <span>{saving ? "Guardando…" : "Guardar"}</span>
          </button>
          <button type="button" onClick={resetSheet} disabled={!ready || readOnly} aria-label="Reiniciar hoja">
            <RotateCcw size={15} aria-hidden />
            <span>Reiniciar</span>
          </button>
        </div>
      </header>

      <div className="hoja-calculo-formula-bar">
        <span aria-hidden>fx</span>
        <input
          aria-label="Fórmula de la celda seleccionada"
          value={formulaDraft}
          onChange={(event) => setFormulaDraft(event.target.value)}
          onBlur={commitFormula}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitFormula();
            }
          }}
          disabled={!ready || readOnly || !selectedCell}
          placeholder={selectedCell ? "Escribe un valor o una fórmula" : "Selecciona una celda para ver su fórmula"}
          spellCheck={false}
        />
      </div>

      {readOnly ? (
        <p className="hoja-calculo-readonly" role="note">
          Modo lectura: puedes consultar y exportar la hoja, pero no editarla ni guardarla.
        </p>
      ) : null}

      <div className="hoja-calculo-layout">
        <section className="hoja-calculo-stage" aria-label="Hoja de cálculo">
          <div ref={gridRef} className="hoja-calculo-grid" />
          {initError ? <p className="hoja-calculo-fallback" role="alert">{initError}</p> : null}
        </section>
        <aside className="hoja-calculo-side">
          <section className="hoja-calculo-info">
            <h3>Presupuesto de ejemplo</h3>
            <p>Edita las celdas y cambia cantidades y precios. Las fórmulas se calculan automáticamente y se conservan como texto en el proyecto.</p>
            <p className="hoja-calculo-status" role="status">{statusText}</p>
            <div className="hoja-calculo-calculation" aria-live="polite">
              <p className="hoja-calculo-calculation-head">
                <strong>{errorCount ? `${errorCount} ${errorCount === 1 ? "celda con error" : "celdas con error"}` : "Cálculo correcto"}</strong>
                <span>{calculation.formulas} {calculation.formulas === 1 ? "fórmula" : "fórmulas"}</span>
              </p>
              {errorCount ? (
                <ul className="hoja-calculo-errors">
                  {calculation.errors.slice(0, 3).map((entry) => (
                    <li key={entry.label}><code>{entry.label}</code> {entry.error}</li>
                  ))}
                  {errorCount > 3 ? <li>+{errorCount - 3} más</li> : null}
                </ul>
              ) : null}
              {limitLabels.length ? (
                <p className="hoja-calculo-limit">Límite alcanzado: {limitLabels.join(", ")}.</p>
              ) : null}
            </div>
          </section>
          <section className="hoja-calculo-help">
            <h3>Atajos</h3>
            <ul>
              <li>Haz clic o arrastra para seleccionar celdas.</li>
              <li>Selecciona una celda y edita su contenido en la barra <code>fx</code>.</li>
              <li>Empieza una fórmula con <code>=</code>. Admite <code>SUM</code>, <code>AVERAGE</code>, <code>MIN</code>, <code>MAX</code>, <code>COUNT</code>, <code>IF</code>, <code>ROUND</code> y <code>ABS</code>.</li>
              <li>Los errores <code>#VALOR!</code>, <code>#REF!</code>, <code>#DIV/0!</code>, <code>#NOMBRE!</code> y <code>#CIRC!</code> se muestran en su celda.</li>
              <li>Límites: 2.000 caracteres por fórmula, 10.000 celdas por rango y 200 niveles de dependencia.</li>
              <li>Las filas y columnas se añaden al final.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
