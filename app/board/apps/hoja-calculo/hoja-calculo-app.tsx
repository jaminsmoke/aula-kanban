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
  Eraser,
  Italic,
  RotateCcw,
  Rows3,
  Sheet,
} from "lucide-react";
import {
  SHEET_COLUMNS,
  SHEET_HEADERS,
  SHEET_ROWS,
  STARTER_SHEET,
  normalizeSheet,
  selectionToRange,
  type SpreadsheetCell,
  type SpreadsheetDocument,
} from "./hoja-calculo-model";
import "./hoja-calculo.css";

type Worksheet = jspreadsheet.WorksheetInstance;

/**
 * Hoja de cálculo con celdas, fórmulas y formato esencial.
 * @returns La ventana con la rejilla y la barra de herramientas.
 */
export default function HojaCalculoApp() {
  const gridRef = useRef<HTMLDivElement>(null);
  const worksheetRef = useRef<Worksheet | null>(null);
  const [documentValue, setDocumentValue] = useState<SpreadsheetDocument>({ data: STARTER_SHEET });
  const initialDataRef = useRef(documentValue.data);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("Hoja de ejemplo lista. Las fórmulas se recalculan al editar.");
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    let active = true;

    try {
      jspreadsheet(element, {
        worksheets: [
          {
            data: initialDataRef.current,
            minDimensions: [SHEET_COLUMNS, SHEET_ROWS],
            columns: SHEET_HEADERS.map((title, index) => ({
              title,
              width: index === 0 ? 190 : 110,
              type: index === 1 || index === 2 || index === 3 ? "numeric" : "text",
            })),
            tableOverflow: true,
            tableHeight: "100%",
          },
        ],
        toolbar: false,
        onload: (instance) => {
          if (!active) return;
          worksheetRef.current = instance.worksheets[0] ?? null;
          setReady(true);
        },
        onchange: (instance) => {
          if (!active) return;
          const nextData = normalizeSheet(instance.getData() as SpreadsheetCell[][]);
          setDocumentValue({ data: nextData });
          setDirty(true);
          setStatus("Cambios sin guardar.");
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
  }, []);

  /**
   * Sincroniza la hoja con el estado de React después de una acción de la barra.
   * @param message - Mensaje que se muestra en la barra de estado.
   */
  function syncDocument(message: string) {
    const worksheet = worksheetRef.current;
    if (!worksheet) return;
    setDocumentValue({ data: normalizeSheet(worksheet.getData() as SpreadsheetCell[][]) });
    setDirty(true);
    setStatus(message);
  }

  /**
   * Inserta una fila al final de la hoja.
   */
  function addRow() {
    const worksheet = worksheetRef.current;
    if (!worksheet) return;
    worksheet.insertRow();
    syncDocument("Fila añadida.");
  }

  /**
   * Inserta una columna al final de la hoja.
   */
  function addColumn() {
    const worksheet = worksheetRef.current;
    if (!worksheet) return;
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
    if (!worksheet) return;
    worksheet.setStyle(selectionToRange(worksheet.getSelection()), property, value);
    syncDocument(message);
  }

  /**
   * Quita el formato esencial de la selección actual.
   */
  function clearFormat() {
    const worksheet = worksheetRef.current;
    if (!worksheet) return;
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
    if (!worksheet) return;
    worksheet.setData(STARTER_SHEET.map((row) => [...row]));
    setDocumentValue({ data: STARTER_SHEET.map((row) => [...row]) });
    setDirty(true);
    setStatus("Hoja reiniciada con el ejemplo.");
  }

  return (
    <div className="hoja-calculo-app">
      <header className="hoja-calculo-toolbar">
        <div className="hoja-calculo-heading">
          <span className="hoja-calculo-mark" aria-hidden>
            <Sheet size={18} strokeWidth={2} />
          </span>
          <span>
            <strong>Hoja de cálculo</strong>
            <small>Celdas y fórmulas</small>
          </span>
        </div>
        <div className="hoja-calculo-actions" role="group" aria-label="Herramientas de la hoja">
          <button type="button" onClick={addRow} disabled={!ready} aria-label="Añadir fila">
            <Rows3 size={15} aria-hidden />
            <span>Fila</span>
          </button>
          <button type="button" onClick={addColumn} disabled={!ready} aria-label="Añadir columna">
            <Columns3 size={15} aria-hidden />
            <span>Columna</span>
          </button>
          <button type="button" onClick={() => applyStyle("font-weight", "bold", "Negrita aplicada.")} disabled={!ready} aria-label="Negrita">
            <Bold size={15} aria-hidden />
            <span>Negrita</span>
          </button>
          <button type="button" onClick={() => applyStyle("font-style", "italic", "Cursiva aplicada.")} disabled={!ready} aria-label="Cursiva">
            <Italic size={15} aria-hidden />
            <span>Cursiva</span>
          </button>
          <button type="button" onClick={() => applyStyle("text-align", "left", "Alineación izquierda.")} disabled={!ready} aria-label="Alinear a la izquierda">
            <AlignLeft size={15} aria-hidden />
          </button>
          <button type="button" onClick={() => applyStyle("text-align", "center", "Alineación centrada.")} disabled={!ready} aria-label="Centrar">
            <AlignCenter size={15} aria-hidden />
          </button>
          <button type="button" onClick={() => applyStyle("text-align", "right", "Alineación derecha.")} disabled={!ready} aria-label="Alinear a la derecha">
            <AlignRight size={15} aria-hidden />
          </button>
          <button type="button" onClick={clearFormat} disabled={!ready} aria-label="Limpiar formato">
            <Eraser size={15} aria-hidden />
            <span>Limpiar</span>
          </button>
          <button type="button" onClick={resetSheet} disabled={!ready} aria-label="Reiniciar hoja">
            <RotateCcw size={15} aria-hidden />
            <span>Reiniciar</span>
          </button>
        </div>
      </header>

      <div className="hoja-calculo-layout">
        <section className="hoja-calculo-stage" aria-label="Hoja de cálculo">
          <div ref={gridRef} className="hoja-calculo-grid" />
          {initError ? <p className="hoja-calculo-fallback" role="alert">{initError}</p> : null}
        </section>
        <aside className="hoja-calculo-side">
          <section className="hoja-calculo-info">
            <h3>Presupuesto de ejemplo</h3>
            <p>Edita las celdas, cambia cantidades y precios, y usa las fórmulas de la columna Total.</p>
            <p className="hoja-calculo-status" role="status">
              {initError ?? (dirty ? `${status} Cambios sin guardar.` : status)}
            </p>
          </section>
          <section className="hoja-calculo-help">
            <h3>Atajos</h3>
            <ul>
              <li>Haz clic o arrastra para seleccionar celdas.</li>
              <li>Escribe una fórmula empezando por <code>=</code>.</li>
              <li>Las filas y columnas se añaden al final.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
