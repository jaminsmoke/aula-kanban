"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  TIMELINE_GROUPS,
  formatTimelineDate,
  timelineGroupLabel,
  type TimelineEvent,
} from "./timeline-model";
import type { TimelineEventForm } from "./use-timeline-editor";

type TimelineEventsCardProps = {
  events: TimelineEvent[];
  eventForm: TimelineEventForm;
  editingEventId: string | null;
  readOnly: boolean;
  statusText: string;
  onFormChange: Dispatch<SetStateAction<TimelineEventForm>>;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
};

/**
 * Formulario y lista de eventos.
 * @param props - Documento, formulario y acciones.
 * @returns La tarjeta de eventos.
 */
export function TimelineEventsCard({
  events,
  eventForm,
  editingEventId,
  readOnly,
  statusText,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onCancel,
}: TimelineEventsCardProps) {
  return (
    <section className="timeline-card" aria-label="Eventos">
      <h3>Eventos</h3>
      <form className="timeline-form" onSubmit={onSave}>
        <label htmlFor="timeline-event-title">Título
          <input
            id="timeline-event-title"
            value={eventForm.title}
            onChange={(inputEvent) => onFormChange((current) => ({ ...current, title: inputEvent.target.value }))}
            placeholder="Nombre del evento"
            disabled={readOnly}
          />
        </label>
        <label htmlFor="timeline-event-group">Grupo
          <select
            id="timeline-event-group"
            value={eventForm.groupId}
            onChange={(selectEvent) => onFormChange((current) => ({ ...current, groupId: selectEvent.target.value }))}
            disabled={readOnly}
          >
            {TIMELINE_GROUPS.map((group) => (
              <option key={group.id} value={group.id}>{group.label}</option>
            ))}
          </select>
        </label>
        <div className="timeline-date-row">
          <label htmlFor="timeline-event-start">Inicio
            <input
              id="timeline-event-start"
              type="date"
              value={eventForm.start}
              onChange={(inputEvent) => onFormChange((current) => ({ ...current, start: inputEvent.target.value }))}
              disabled={readOnly}
            />
          </label>
          <label htmlFor="timeline-event-end">Fin (opcional)
            <input
              id="timeline-event-end"
              type="date"
              value={eventForm.end}
              onChange={(inputEvent) => onFormChange((current) => ({ ...current, end: inputEvent.target.value }))}
              disabled={readOnly}
            />
          </label>
        </div>
        <div className="timeline-form-actions">
          <button type="submit" className="timeline-primary" disabled={readOnly}>
            <Plus size={14} aria-hidden />
            {editingEventId ? "Guardar evento" : "Añadir evento"}
          </button>
          {editingEventId ? (
            <button type="button" onClick={onCancel} disabled={readOnly}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>
      <p className="timeline-status" role="status">{statusText}</p>
      <ul className="timeline-list">
        {events.map((event) => (
          <li key={event.id}>
            <div className="timeline-list-text">
              <strong>{event.title}</strong>
              <span>{formatTimelineDate(event.start)} · {timelineGroupLabel(event.groupId)}</span>
            </div>
            <div className="timeline-list-actions">
              <button type="button" onClick={() => onEdit(event)} aria-label={`Editar ${event.title}`} disabled={readOnly}>Editar</button>
              <button type="button" onClick={() => onDelete(event.id)} aria-label={`Eliminar ${event.title}`} disabled={readOnly}>
                <Trash2 size={13} aria-hidden />
              </button>
            </div>
          </li>
        ))}
        {events.length === 0 ? <li className="timeline-empty">No hay eventos.</li> : null}
      </ul>
    </section>
  );
}
