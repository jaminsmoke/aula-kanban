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
import {
  SHEET_COLUMNS,
  SHEET_HEADERS,
  SHEET_ROWS,
  STARTER_SHEET,
  normalizeSheet,
  parseSpreadsheetDocument,
  selectionToRange,
  toCsv,
  type SpreadsheetCell,
  type SpreadsheetDocument,
} from "./hoja-calculo-model";
import "./hoja-calculo.css";

type Worksheet = jspreadsheet.WorksheetInstance;

/**
 * Hoja de cálculo con celdas, fórmulas, formato y persistencia por proyecto.
 * @param props - Proyecto activo y rol del usuario.
 * @returns La ventana con la rejilla y la barra de herramientas.
 */
export default function HojaCalculoApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const worksheetRef = useRef<Worksheet | null>(null);
  const [documentValue, setDocumentValue] = useState<SpreadsheetDocument>({ data: STARTER_SHEET });
  const initialDataRef = useRef(documentValue.data);
  const initialStylesRef = useRef(documentValue.styles);
  const pendingDocumentRef = useRef<SpreadsheetDocument | null>(null);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Hoja de ejemplo lista. Las fórmulas se recalculan al editar.");
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
    worksheet.setData(document.data);
    if (document.styles && Object.keys(document.styles).length) {
      worksheet.setStyle(document.styles);
    }
  }

  /**
   * Captura datos y estilos de la rejilla en el estado de React.
   * @param worksheet - Rejilla que se está editando.
   * @param message - Mensaje de estado.
   */
  function captureDocument(worksheet: Worksheet, message: string) {
    setDocumentValue({
      data: normalizeSheet(worksheet.getData() as SpreadsheetCell[][]),
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
        worksheets: [
          {
            data: initialDataRef.current,
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
          const initialStyles = initialStylesRef.current;
          if (worksheet && initialStyles && Object.keys(initialStyles).length) {
            worksheet.setStyle(initialStyles);
          }
          if (worksheet && pendingDocumentRef.current) {
            applyWorksheet(pendingDocumentRef.current, worksheet);
            setDirty(false);
          }
          setReady(true);
        },
        onchange: (instance) => {
          if (!active) return;
          captureDocument(instance, "Hoja modificada.");
        },
        onchangestyle: (instance) => {
          if (!active) return;
          captureDocument(instance, "Formato actualizado.");
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
  }, [readOnly]);

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
    captureDocument(worksheet, message);
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
    const oldStyles = worksheet.getStyle() as Record<string, string>;
    worksheet.setData(STARTER_SHEET.map((row) => [...row]));
    if (Object.keys(oldStyles).length) worksheet.resetStyle(oldStyles);
    setDocumentValue({ data: STARTER_SHEET.map((row) => [...row]), styles: {} });
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
        data: normalizeSheet(worksheet.getData() as SpreadsheetCell[][]),
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
    const data = normalizeSheet(worksheet.getData() as SpreadsheetCell[][]);
    const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "hoja-calculo.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("CSV descargado.");
  }

  const displayStatus = loading
    ? "Cargando hoja…"
    : error ?? status;
  const statusText = dirty && !loading && !error
    ? `${displayStatus} Cambios sin guardar.`
    : displayStatus;

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
            <p>Edita las celdas, cambia cantidades y precios, y usa las fórmulas de la columna Total.</p>
            <p className="hoja-calculo-status" role="status">{statusText}</p>
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
