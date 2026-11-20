"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  EPOCH_COLORS,
  formatTimelineDate,
  type TimelineEpoch,
  type TimelineEpochColor,
} from "./timeline-model";
import type { TimelineEpochForm } from "./use-timeline-editor";

type TimelineEpochsCardProps = {
  epochs: TimelineEpoch[];
  epochForm: TimelineEpochForm;
  editingEpochId: string | null;
  readOnly: boolean;
  onFormChange: Dispatch<SetStateAction<TimelineEpochForm>>;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: (epoch: TimelineEpoch) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
};

/**
 * Formulario y lista de épocas.
 * @param props - Documento, formulario y acciones.
 * @returns La tarjeta de épocas.
 */
export function TimelineEpochsCard({
  epochs,
  epochForm,
  editingEpochId,
  readOnly,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onCancel,
}: TimelineEpochsCardProps) {
  return (
    <section className="timeline-card" aria-label="Épocas">
      <h3>Épocas</h3>
      <form className="timeline-form" onSubmit={onSave}>
        <label htmlFor="timeline-epoch-label">Etiqueta de la época
          <input
            id="timeline-epoch-label"
            value={epochForm.label}
            onChange={(inputEvent) => onFormChange((current) => ({ ...current, label: inputEvent.target.value }))}
            placeholder="Nombre del periodo"
            disabled={readOnly}
          />
        </label>
        <div className="timeline-date-row">
          <label htmlFor="timeline-epoch-start">Inicio de la época
            <input
              id="timeline-epoch-start"
              type="date"
              value={epochForm.start}
              onChange={(inputEvent) => onFormChange((current) => ({ ...current, start: inputEvent.target.value }))}
              disabled={readOnly}
            />
          </label>
          <label htmlFor="timeline-epoch-end">Fin de la época
            <input
              id="timeline-epoch-end"
              type="date"
              value={epochForm.end}
              onChange={(inputEvent) => onFormChange((current) => ({ ...current, end: inputEvent.target.value }))}
              disabled={readOnly}
            />
          </label>
        </div>
        <label htmlFor="timeline-epoch-color">Color
          <select
            id="timeline-epoch-color"
            value={epochForm.color}
            onChange={(selectEvent) => onFormChange((current) => ({
              ...current,
              color: selectEvent.target.value as TimelineEpochColor,
            }))}
            disabled={readOnly}
          >
            {EPOCH_COLORS.map((color) => (
              <option key={color.id} value={color.id}>{color.label}</option>
            ))}
          </select>
        </label>
        <div className="timeline-form-actions">
          <button type="submit" className="timeline-primary" disabled={readOnly}>
            <Plus size={14} aria-hidden />
            {editingEpochId ? "Guardar época" : "Añadir época"}
          </button>
          {editingEpochId ? (
            <button type="button" onClick={onCancel} disabled={readOnly}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>
      <ul className="timeline-list">
        {epochs.map((epoch) => (
          <li key={epoch.id}>
            <div className="timeline-list-text">
              <strong>{epoch.label}</strong>
              <span>{formatTimelineDate(epoch.start)} – {formatTimelineDate(epoch.end)}</span>
            </div>
            <div className="timeline-list-actions">
              <button type="button" onClick={() => onEdit(epoch)} aria-label={`Editar ${epoch.label}`} disabled={readOnly}>Editar</button>
              <button type="button" onClick={() => onDelete(epoch.id)} aria-label={`Eliminar ${epoch.label}`} disabled={readOnly}>
                <Trash2 size={13} aria-hidden />
              </button>
            </div>
          </li>
        ))}
        {epochs.length === 0 ? <li className="timeline-empty ui-empty">No hay épocas.</li> : null}
      </ul>
    </section>
  );
}
