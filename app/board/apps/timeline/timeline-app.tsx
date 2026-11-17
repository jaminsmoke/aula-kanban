"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { DataGroup, DataItem, Timeline as VisTimeline, TimelineOptions } from "vis-timeline";
import "vis-timeline/styles/vis-timeline-graph2d.css";
import { CalendarClock, Plus, RotateCcw, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import {
  EPOCH_COLORS,
  STARTER_TIMELINE,
  TIMELINE_GROUPS,
  buildTimelineItems,
  formatTimelineDate,
  isValidTimelineRange,
  timelineGroupLabel,
  timelineWindow,
  type TimelineDocument,
  type TimelineEpoch,
  type TimelineEpochColor,
  type TimelineEvent,
} from "./timeline-model";
import "./timeline.css";

type EventForm = {
  title: string;
  groupId: string;
  start: string;
  end: string;
};

type EpochForm = {
  label: string;
  start: string;
  end: string;
  color: TimelineEpochColor;
};

const DEFAULT_EVENT_FORM: EventForm = {
  title: "",
  groupId: TIMELINE_GROUPS[0].id,
  start: "1960-01-01",
  end: "",
};

const DEFAULT_EPOCH_FORM: EpochForm = {
  label: "",
  start: "1960-01-01",
  end: "1970-01-01",
  color: "violet",
};

const TIMELINE_OPTIONS: TimelineOptions = {
  autoResize: true,
  height: "100%",
  editable: false,
  selectable: true,
  multiselect: false,
  stack: true,
  zoomable: true,
  moveable: true,
  showCurrentTime: false,
  orientation: { axis: "top" },
  margin: { item: { horizontal: 12, vertical: 8 }, axis: 10 },
};

/**
 * Genera un identificador local para un evento o una época.
 * @param prefix - Prefijo legible.
 * @returns Identificador único dentro de la sesión.
 */
function createTimelineId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Líneas de tiempo: eventos, épocas, grupos y zoom sobre un documento local.
 * @returns La ventana con el lienzo temporal y el panel de edición.
 */
export default function TimelineApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<VisTimeline | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>(STARTER_TIMELINE.events);
  const [epochs, setEpochs] = useState<TimelineEpoch[]>(STARTER_TIMELINE.epochs);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEpochId, setEditingEpochId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>(DEFAULT_EVENT_FORM);
  const [epochForm, setEpochForm] = useState<EpochForm>(DEFAULT_EPOCH_FORM);
  const [status, setStatus] = useState("Línea temporal de ejemplo lista.");
  const [initError, setInitError] = useState<string | null>(null);
  const documentValue = useMemo<TimelineDocument>(() => ({ events, epochs }), [events, epochs]);
  const eventsRef = useRef(events);
  const epochsRef = useRef(epochs);
  const documentRef = useRef(documentValue);
  eventsRef.current = events;
  epochsRef.current = epochs;
  documentRef.current = documentValue;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let active = true;
    let timeline: VisTimeline | null = null;

    void import("vis-timeline/standalone")
      .then(({ Timeline }) => {
        if (!active) return;
        try {
          const groups: DataGroup[] = TIMELINE_GROUPS.map((group) => ({ id: group.id, content: group.label }));
          const items: DataItem[] = buildTimelineItems(documentRef.current);
          const windowRange = timelineWindow(documentRef.current);
          timeline = new Timeline(element, items, groups, {
            ...TIMELINE_OPTIONS,
            ...(windowRange ? { start: windowRange.start, end: windowRange.end } : {}),
          });
          timelineRef.current = timeline;
          timeline.on("select", (properties) => {
            const selected = properties?.items?.[0];
            if (selected === undefined) return;
            const id = String(selected);
            if (id.startsWith("epoch-")) {
              const epoch = epochsRef.current.find((item) => item.id === id.slice(6));
              if (epoch) startEditEpoch(epoch);
              return;
            }
            const event = eventsRef.current.find((item) => item.id === id);
            if (event) startEditEvent(event);
          });
        } catch {
          setInitError("No se pudo iniciar la línea temporal. Recarga la página para intentarlo de nuevo.");
        }
      })
      .catch(() => {
        if (active) {
          setInitError("No se pudo cargar el visor temporal. Recarga la página para intentarlo de nuevo.");
        }
      });

    return () => {
      active = false;
      timeline?.destroy();
      element.replaceChildren();
      timelineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    timeline.setItems(buildTimelineItems(documentValue));
  }, [documentValue]);

  /**
   * Carga un evento en el formulario para editarlo.
   * @param event - Evento seleccionado.
   */
  function startEditEvent(event: TimelineEvent) {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      groupId: event.groupId,
      start: event.start,
      end: event.end ?? "",
    });
    setStatus(`Editando «${event.title}».`);
  }

  /**
   * Carga una época en el formulario para editarla.
   * @param epoch - Época seleccionada.
   */
  function startEditEpoch(epoch: TimelineEpoch) {
    setEditingEpochId(epoch.id);
    setEpochForm({
      label: epoch.label,
      start: epoch.start,
      end: epoch.end,
      color: epoch.color,
    });
    setStatus(`Editando la época «${epoch.label}».`);
  }

  /**
   * Guarda el evento del formulario, creando uno nuevo o actualizando el actual.
   * @param submitEvent - Evento del formulario.
   */
  function saveEvent(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const title = eventForm.title.trim();
    if (!title) {
      setStatus("Escribe un título para el evento.");
      return;
    }
    if (!isValidTimelineRange(eventForm.start, eventForm.end || undefined)) {
      setStatus("Revisa las fechas: el fin debe ser posterior al inicio.");
      return;
    }

    const nextEvent: TimelineEvent = {
      id: editingEventId ?? createTimelineId("event"),
      title,
      groupId: eventForm.groupId,
      start: eventForm.start,
      end: eventForm.end || undefined,
    };

    setEvents((current) => (
      editingEventId
        ? current.map((event) => (event.id === editingEventId ? nextEvent : event))
        : [...current, nextEvent]
    ));
    setStatus(editingEventId ? "Evento actualizado." : "Evento añadido.");
    setEditingEventId(null);
    setEventForm({ ...DEFAULT_EVENT_FORM, groupId: eventForm.groupId });
  }

  /**
   * Elimina un evento de la línea temporal.
   * @param id - Identificador del evento.
   */
  function deleteEvent(id: string) {
    const event = events.find((item) => item.id === id);
    setEvents((current) => current.filter((item) => item.id !== id));
    if (editingEventId === id) {
      setEditingEventId(null);
      setEventForm(DEFAULT_EVENT_FORM);
    }
    setStatus(event ? `Evento «${event.title}» eliminado.` : "Evento eliminado.");
  }

  /**
   * Guarda la época del formulario, creando una nueva o actualizando la actual.
   * @param submitEvent - Evento del formulario.
   */
  function saveEpoch(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const label = epochForm.label.trim();
    if (!label) {
      setStatus("Escribe una etiqueta para la época.");
      return;
    }
    if (!isValidTimelineRange(epochForm.start, epochForm.end)) {
      setStatus("Revisa las fechas de la época: el fin debe ser posterior al inicio.");
      return;
    }

    const nextEpoch: TimelineEpoch = {
      id: editingEpochId ?? createTimelineId("epoch"),
      label,
      start: epochForm.start,
      end: epochForm.end,
      color: epochForm.color,
    };

    setEpochs((current) => (
      editingEpochId
        ? current.map((epoch) => (epoch.id === editingEpochId ? nextEpoch : epoch))
        : [...current, nextEpoch]
    ));
    setStatus(editingEpochId ? "Época actualizada." : "Época añadida.");
    setEditingEpochId(null);
    setEpochForm(DEFAULT_EPOCH_FORM);
  }

  /**
   * Elimina una época de la línea temporal.
   * @param id - Identificador de la época.
   */
  function deleteEpoch(id: string) {
    const epoch = epochs.find((item) => item.id === id);
    setEpochs((current) => current.filter((item) => item.id !== id));
    if (editingEpochId === id) {
      setEditingEpochId(null);
      setEpochForm(DEFAULT_EPOCH_FORM);
    }
    setStatus(epoch ? `Época «${epoch.label}» eliminada.` : "Época eliminada.");
  }

  /**
   * Aplica un paso de zoom al lienzo.
   * @param direction - Acercar o alejar.
   */
  function zoom(direction: "in" | "out") {
    const timeline = timelineRef.current;
    if (!timeline) return;
    if (direction === "in") timeline.zoomIn(0.3);
    else timeline.zoomOut(0.3);
    setStatus(direction === "in" ? "Vista ampliada." : "Vista reducida.");
  }

  /**
   * Ajusta el rango visible a todos los elementos.
   */
  function fitTimeline() {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const windowRange = timelineWindow(documentRef.current);
    if (windowRange) timeline.setWindow(windowRange.start, windowRange.end);
    setStatus("Vista reajustada a toda la línea temporal.");
  }

  return (
    <div className="timeline-app">
      <header className="timeline-toolbar">
        <div className="timeline-heading">
          <span className="timeline-mark" aria-hidden>
            <CalendarClock size={18} strokeWidth={2} />
          </span>
          <span>
            <strong>Líneas de tiempo</strong>
            <small>Eventos y épocas</small>
          </span>
        </div>
        <div className="timeline-actions" role="group" aria-label="Controles de la línea temporal">
          <button type="button" onClick={() => zoom("in")} aria-label="Acercar">
            <ZoomIn size={15} aria-hidden />
            <span>Acercar</span>
          </button>
          <button type="button" onClick={() => zoom("out")} aria-label="Alejar">
            <ZoomOut size={15} aria-hidden />
            <span>Alejar</span>
          </button>
          <button type="button" onClick={fitTimeline} aria-label="Recentrar vista">
            <RotateCcw size={15} aria-hidden />
            <span>Recentrar</span>
          </button>
        </div>
      </header>

      <div className="timeline-layout">
        <section className="timeline-stage" aria-label="Línea temporal">
          <div className="timeline-canvas" ref={containerRef} />
          {initError ? <p className="timeline-fallback" role="alert">{initError}</p> : null}
          <p className="timeline-hint">
            Arrastra el lienzo para moverte y usa la rueda o los botones para cambiar el zoom.
          </p>
        </section>

        <aside className="timeline-side">
          <section className="timeline-card" aria-label="Eventos">
            <h3>Eventos</h3>
            <form className="timeline-form" onSubmit={saveEvent}>
              <label htmlFor="timeline-event-title">Título
                <input
                  id="timeline-event-title"
                  value={eventForm.title}
                  onChange={(inputEvent) => setEventForm((current) => ({ ...current, title: inputEvent.target.value }))}
                  placeholder="Nombre del evento"
                />
              </label>
              <label htmlFor="timeline-event-group">Grupo
                <select
                  id="timeline-event-group"
                  value={eventForm.groupId}
                  onChange={(selectEvent) => setEventForm((current) => ({ ...current, groupId: selectEvent.target.value }))}
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
                    onChange={(inputEvent) => setEventForm((current) => ({ ...current, start: inputEvent.target.value }))}
                  />
                </label>
                <label htmlFor="timeline-event-end">Fin (opcional)
                  <input
                    id="timeline-event-end"
                    type="date"
                    value={eventForm.end}
                    onChange={(inputEvent) => setEventForm((current) => ({ ...current, end: inputEvent.target.value }))}
                  />
                </label>
              </div>
              <div className="timeline-form-actions">
                <button type="submit" className="timeline-primary">
                  <Plus size={14} aria-hidden />
                  {editingEventId ? "Guardar evento" : "Añadir evento"}
                </button>
                {editingEventId ? (
                  <button type="button" onClick={() => { setEditingEventId(null); setEventForm(DEFAULT_EVENT_FORM); }}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
            <p className="timeline-status" role="status">{status}</p>
            <ul className="timeline-list">
              {events.map((event) => (
                <li key={event.id}>
                  <div className="timeline-list-text">
                    <strong>{event.title}</strong>
                    <span>{formatTimelineDate(event.start)} · {timelineGroupLabel(event.groupId)}</span>
                  </div>
                  <div className="timeline-list-actions">
                    <button type="button" onClick={() => startEditEvent(event)} aria-label={`Editar ${event.title}`}>Editar</button>
                    <button type="button" onClick={() => deleteEvent(event.id)} aria-label={`Eliminar ${event.title}`}>
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
              {events.length === 0 ? <li className="timeline-empty">No hay eventos.</li> : null}
            </ul>
          </section>

          <section className="timeline-card" aria-label="Épocas">
            <h3>Épocas</h3>
            <form className="timeline-form" onSubmit={saveEpoch}>
              <label htmlFor="timeline-epoch-label">Etiqueta de la época
                <input
                  id="timeline-epoch-label"
                  value={epochForm.label}
                  onChange={(inputEvent) => setEpochForm((current) => ({ ...current, label: inputEvent.target.value }))}
                  placeholder="Nombre del periodo"
                />
              </label>
              <div className="timeline-date-row">
                <label htmlFor="timeline-epoch-start">Inicio de la época
                  <input
                    id="timeline-epoch-start"
                    type="date"
                    value={epochForm.start}
                    onChange={(inputEvent) => setEpochForm((current) => ({ ...current, start: inputEvent.target.value }))}
                  />
                </label>
                <label htmlFor="timeline-epoch-end">Fin de la época
                  <input
                    id="timeline-epoch-end"
                    type="date"
                    value={epochForm.end}
                    onChange={(inputEvent) => setEpochForm((current) => ({ ...current, end: inputEvent.target.value }))}
                  />
                </label>
              </div>
              <label htmlFor="timeline-epoch-color">Color
                <select
                  id="timeline-epoch-color"
                  value={epochForm.color}
                  onChange={(selectEvent) => setEpochForm((current) => ({ ...current, color: selectEvent.target.value as TimelineEpochColor }))}
                >
                  {EPOCH_COLORS.map((color) => (
                    <option key={color.id} value={color.id}>{color.label}</option>
                  ))}
                </select>
              </label>
              <div className="timeline-form-actions">
                <button type="submit" className="timeline-primary">
                  <Plus size={14} aria-hidden />
                  {editingEpochId ? "Guardar época" : "Añadir época"}
                </button>
                {editingEpochId ? (
                  <button type="button" onClick={() => { setEditingEpochId(null); setEpochForm(DEFAULT_EPOCH_FORM); }}>
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
                    <button type="button" onClick={() => startEditEpoch(epoch)} aria-label={`Editar ${epoch.label}`}>Editar</button>
                    <button type="button" onClick={() => deleteEpoch(epoch.id)} aria-label={`Eliminar ${epoch.label}`}>
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
              {epochs.length === 0 ? <li className="timeline-empty">No hay épocas.</li> : null}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
