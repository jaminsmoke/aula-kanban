"use client";

import { useRef } from "react";
import type { StoreRole } from "../types";
import { HojaCalculoFormulaBar } from "./hoja-calculo-formula-bar";
import { HojaCalculoSidePanel } from "./hoja-calculo-side-panel";
import { HojaCalculoToolbar } from "./hoja-calculo-toolbar";
import { useHojaCalculoDocument } from "./use-hoja-calculo-document";
import { useHojaCalculoGrid } from "./use-hoja-calculo-grid";
import "../app-window.css";
import "./hoja-calculo.css";

/**
 * Hoja de cálculo con celdas, formato y persistencia por proyecto.
 * @param props - Proyecto activo y rol del usuario.
 * @returns La ventana con la rejilla y la barra de herramientas.
 */
export default function HojaCalculoApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const documentState = useHojaCalculoDocument(projectId, role);
  const grid = useHojaCalculoGrid({
    containerRef: gridRef,
    initialDocument: documentState.documentValue,
    pendingDocument: documentState.pendingDocument,
    readOnly: documentState.readOnly,
    onDocumentChange: documentState.setDocumentValue,
    onPendingDocumentConsumed: documentState.clearPendingDocument,
    onDirty: documentState.markDirty,
    onStatus: documentState.setStatus,
    onSave: documentState.saveDocument,
  });

  const displayStatus = documentState.loading
    ? "Cargando hoja…"
    : documentState.status || documentState.error || "";
  const statusText = documentState.dirty && !documentState.loading
    ? `${displayStatus} Cambios sin guardar.`
    : displayStatus;

  return (
    <div className="app-window hoja-calculo-app">
      <HojaCalculoToolbar
        ready={grid.ready}
        readOnly={documentState.readOnly}
        saving={documentState.saving}
        loading={documentState.loading}
        hasSelection={Boolean(grid.selectedRange)}
        onAddRow={grid.addRow}
        onAddColumn={grid.addColumn}
        onApplyStyle={grid.applyStyle}
        onClearFormat={grid.clearFormat}
        onCopySelection={() => void grid.copySelection()}
        onExportCsv={grid.exportCsv}
        onReload={documentState.reloadDocument}
        onSave={grid.saveSheet}
        onReset={grid.resetSheet}
      />

      <HojaCalculoFormulaBar
        value={grid.formulaDraft}
        hasSelection={Boolean(grid.selectedRange)}
        ready={grid.ready}
        readOnly={documentState.readOnly}
        onChange={grid.setFormulaDraft}
        onCommit={grid.commitFormula}
      />

      {documentState.readOnly ? (
        <p className="hoja-calculo-readonly" role="note">
          Modo lectura: puedes consultar y exportar la hoja, pero no editarla ni guardarla.
        </p>
      ) : null}

      <div className="hoja-calculo-layout">
        <section className="hoja-calculo-stage" aria-label="Hoja de cálculo">
          <div ref={gridRef} className="hoja-calculo-grid" />
          {grid.initError ? <p className="hoja-calculo-fallback" role="alert">{grid.initError}</p> : null}
        </section>
        <HojaCalculoSidePanel calculation={grid.calculation} statusText={statusText} />
      </div>
    </div>
  );
}
