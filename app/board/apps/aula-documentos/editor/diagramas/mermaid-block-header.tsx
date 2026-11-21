"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Code2,
  Copy,
  Download,
  GripVertical,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { MERMAID_TEMPLATES } from "../../../../../../lib/domain/mermaid/templates";

type MermaidBlockHeaderProps = {
  readOnly: boolean;
  editing: boolean;
  canApply: boolean;
  canRestore: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canExportSvg: boolean;
  onApplyTemplate: (templateId: string) => void;
  onCopy: () => void;
  onDownloadSvg: () => void;
  onRestore: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onApply: () => void;
  onCancel: () => void;
  onStartEditing: () => void;
  onDelete: () => void;
};

/**
 * Cabecera del bloque Mermaid con plantillas y acciones.
 * @param props - Estado y acciones del bloque.
 * @returns La cabecera.
 */
export function MermaidBlockHeader({
  readOnly,
  editing,
  canApply,
  canRestore,
  canMoveUp,
  canMoveDown,
  canExportSvg,
  onApplyTemplate,
  onCopy,
  onDownloadSvg,
  onRestore,
  onMoveUp,
  onMoveDown,
  onApply,
  onCancel,
  onStartEditing,
  onDelete,
}: MermaidBlockHeaderProps) {
  return (
    <div className="aula-mermaid-head">
      <span className="aula-mermaid-grip" data-drag-handle title="Arrastrar para mover">
        <GripVertical size={15} aria-hidden />
      </span>
      <span className="aula-mermaid-label">
        <Code2 size={15} aria-hidden />
        Diagrama Mermaid
      </span>
      {!readOnly ? (
        <select
          className="aula-mermaid-template"
          aria-label="Insertar plantilla Mermaid"
          defaultValue=""
          onChange={(event) => {
            onApplyTemplate(event.currentTarget.value);
            event.currentTarget.value = "";
          }}
        >
          <option value="">Plantilla…</option>
          {MERMAID_TEMPLATES.map((template) => (
            <option value={template.id} key={template.id}>{template.label}</option>
          ))}
        </select>
      ) : null}
      {!readOnly ? (
        <span className="aula-mermaid-actions">
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={onCopy}
            aria-label="Copiar código Mermaid"
            title="Copiar código Mermaid"
          >
            <Copy size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={onDownloadSvg}
            disabled={!canExportSvg}
            aria-label="Exportar diagrama SVG"
            title="Exportar diagrama SVG"
          >
            <Download size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={onRestore}
            disabled={!canRestore}
            aria-label="Restaurar última versión válida del diagrama"
            title="Restaurar última versión válida del diagrama"
          >
            <RotateCcw size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Mover diagrama arriba"
            title="Mover diagrama arriba"
          >
            <ArrowUp size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Mover diagrama abajo"
            title="Mover diagrama abajo"
          >
            <ArrowDown size={14} aria-hidden />
          </button>
          {editing ? (
            <>
              <button type="button" className="aula-mermaid-action" onClick={onApply} disabled={!canApply}>
                <Check size={14} aria-hidden />
                Aplicar
              </button>
              <button type="button" className="aula-mermaid-action secondary" onClick={onCancel}>
                <X size={14} aria-hidden />
                Descartar
              </button>
            </>
          ) : (
            <button type="button" className="aula-mermaid-action" onClick={onStartEditing}>
              <Pencil size={14} aria-hidden />
              Editar
            </button>
          )}
          <button
            type="button"
            className="aula-mermaid-action danger"
            onClick={onDelete}
            aria-label="Eliminar diagrama"
            title="Eliminar diagrama"
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </span>
      ) : null}
    </div>
  );
}
