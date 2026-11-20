"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useEffect, useState } from "react";

const buttonStyle = {
  minHeight: 28,
  padding: "3px 7px",
  border: "var(--border-width-hairline) solid var(--ui-border-control)",
  borderRadius: "var(--radius-xs)",
  background: "var(--ui-surface-raised)",
  color: "var(--ui-text-secondary)",
  font: "inherit",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
} as const;

/**
 * Selector de tamaño para insertar una tabla.
 * @param props - Acciones de inserción y cierre.
 * @returns Un diálogo modal de cuadrícula.
 */
export function AulaTablePicker({
  editor,
  onInserted,
  onClose,
}: {
  editor: Editor;
  onInserted?: (message: string) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const size = 6;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "var(--ui-scrim)",
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Insertar tabla"
        style={{
          width: "min(100%, 320px)",
          padding: 14,
          border: "var(--border-width-hairline) solid var(--ui-border-strong)",
          borderRadius: "var(--radius-md)",
          background: "var(--ui-surface-raised)",
          boxShadow: "var(--ui-shadow-card-hover)",
          color: "var(--ui-text-primary)",
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>Insertar tabla</h2>
        <p style={{ margin: "0 0 10px", color: "var(--ui-text-muted)", fontSize: 11.5 }}>
          Elige el número de filas y columnas.
        </p>
        <div role="grid" aria-label="Tamaño de la tabla" style={{ display: "grid", gridTemplateColumns: `repeat(${size}, 28px)`, gap: 4 }}>
          {Array.from({ length: size }, (_, row) => (
            Array.from({ length: size }, (_, col) => {
              const active = row < rows && col < cols;
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  role="gridcell"
                  aria-label={`Crear tabla de ${row + 1} filas y ${col + 1} columnas`}
                  aria-selected={active}
                  autoFocus={row === 0 && col === 0}
                  onMouseEnter={() => {
                    setRows(row + 1);
                    setCols(col + 1);
                  }}
                  onClick={() => {
                    editor.chain().focus(undefined, { scrollIntoView: false }).insertTable({ rows: row + 1, cols: col + 1, withHeaderRow: true }).run();
                    onInserted?.(`Tabla de ${row + 1} × ${col + 1} insertada.`);
                    onClose();
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    border: "var(--border-width-hairline) solid var(--ui-border-control)",
                    borderRadius: "var(--radius-xs)",
                    background: active ? "var(--ui-action-soft)" : "var(--ui-surface-pale)",
                    cursor: "pointer",
                  }}
                />
              );
            })
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
          <span style={{ color: "var(--ui-text-muted)", fontSize: 11.5 }}>{rows} × {cols}</span>
          <button type="button" onClick={onClose} style={buttonStyle}>Cancelar</button>
        </div>
      </section>
    </div>
  );
}

/**
 * Barra contextual para editar la tabla activa.
 * @param props - Editor de Tiptap.
 * @returns Acciones de filas, columnas y tabla.
 */
export function AulaTableControls({ editor }: { editor: Editor }) {
  const header = useEditorState({
    editor,
    selector: ({ editor: current }) => current?.isActive("tableHeader") ?? false,
  }) ?? false;
  const [confirming, setConfirming] = useState(false);

  /**
   * Ejecuta una acción y cierra la confirmación de borrado.
   * @param action - Acción de Tiptap.
   */
  function run(action: () => void) {
    action();
    setConfirming(false);
  }

  return (
    <div
      role="toolbar"
      aria-label="Herramientas de tabla"
      style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, width: "100%", marginTop: 5 }}
    >
      <span style={{ marginRight: 2, color: "var(--ui-text-muted)", fontSize: 11, fontWeight: 700 }}>Tabla</span>
      <button type="button" style={buttonStyle} aria-label="Añadir fila arriba" onClick={() => run(() => editor.chain().focus(undefined, { scrollIntoView: false }).addRowBefore().run())}>Fila ↑</button>
      <button type="button" style={buttonStyle} aria-label="Añadir fila abajo" onClick={() => run(() => editor.chain().focus(undefined, { scrollIntoView: false }).addRowAfter().run())}>Fila ↓</button>
      <button type="button" style={buttonStyle} aria-label="Eliminar fila" onClick={() => run(() => editor.chain().focus(undefined, { scrollIntoView: false }).deleteRow().run())}>− Fila</button>
      <button type="button" style={buttonStyle} aria-label="Añadir columna a la izquierda" onClick={() => run(() => editor.chain().focus(undefined, { scrollIntoView: false }).addColumnBefore().run())}>Col ←</button>
      <button type="button" style={buttonStyle} aria-label="Añadir columna a la derecha" onClick={() => run(() => editor.chain().focus(undefined, { scrollIntoView: false }).addColumnAfter().run())}>Col →</button>
      <button type="button" style={buttonStyle} aria-label="Eliminar columna" onClick={() => run(() => editor.chain().focus(undefined, { scrollIntoView: false }).deleteColumn().run())}>− Col</button>
      <button
        type="button"
        style={{ ...buttonStyle, background: header ? "var(--ui-action-soft)" : "var(--ui-surface-raised)" }}
        aria-label="Alternar fila de cabecera"
        aria-pressed={header}
        onClick={() => run(() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeaderRow().run())}
      >
        Cabecera
      </button>
      {confirming ? (
        <>
          <button type="button" style={buttonStyle} onClick={() => setConfirming(false)}>Cancelar</button>
          <button type="button" style={{ ...buttonStyle, color: "var(--ui-danger-ink)" }} onClick={() => run(() => editor.commands.deleteTable())}>Confirmar borrado</button>
        </>
      ) : (
        <button type="button" style={{ ...buttonStyle, color: "var(--ui-danger-ink)" }} onClick={() => setConfirming(true)} aria-label="Eliminar tabla">Eliminar tabla</button>
      )}
    </div>
  );
}

/**
 * Integra el selector y la barra de tabla en el editor.
 * @param props - Editor y estado de solo lectura.
 * @returns El selector modal y, si hay una tabla activa, sus controles.
 */
export function AulaTableUi({ editor, readOnly }: { editor: Editor | null; readOnly: boolean }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => current?.isActive("table") ?? false,
  }) ?? false;

  useEffect(() => {
    const open = () => setPickerOpen(true);
    window.addEventListener("aula-documentos:insert-table", open);
    return () => window.removeEventListener("aula-documentos:insert-table", open);
  }, []);

  if (!editor || readOnly) return null;
  return (
    <>
      <span data-aula-table-ready hidden />
      {pickerOpen ? <AulaTablePicker editor={editor} onClose={() => setPickerOpen(false)} /> : null}
      {active ? <AulaTableControls editor={editor} /> : null}
    </>
  );
}
