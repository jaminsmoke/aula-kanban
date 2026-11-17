"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { DataGroup, DataItem, Timeline as VisTimeline, TimelineOptions } from "vis-timeline";
import "vis-timeline/styles/vis-timeline-graph2d.css";
import { CalendarClock, FolderOpen, Plus, RotateCcw, Save, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import type { StoreRole } from "../types";
import { useAppDocument } from "../use-app-document";
import {
  EPOCH_COLORS,
  STARTER_TIMELINE,
  TIMELINE_GROUPS,
  TIMELINE_TEMPLATES,
  buildTimelineItems,
  formatTimelineDate,
  isValidTimelineRange,
  parseTimelineDate,
  parseTimelineDocument,
  timelineGroupLabel,
  timelineRange,
  timelineWindow,
  toTimelineIsoDate,
  type TimelineDocument,
  type TimelineEpoch,
  type TimelineEpochColor,
  type TimelineEvent,
  type TimelineRange,
  type TimelineTemplateId,
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

const DEFAULT_TEMPLATE: TimelineTemplateId = "espacial";

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
 * Devuelve la duración de una animación respetando la reducción de movimiento.
 * @param duration - Duración normal en milisegundos.
 * @returns La duración efectiva.
 */
function motionDuration(duration: number): number {
  if (typeof window === "undefined") return 0;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? 0 : duration;
}

/**
 * Líneas de tiempo: eventos, épocas, grupos, zoom y persistencia por proyecto.
 * @param props - Proyecto activo y rol del usuario.
 * @returns La ventana con el lienzo temporal y el panel de edición.
 */
export default function TimelineApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<VisTimeline | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>(STARTER_TIMELINE.events);
  const [epochs, setEpochs] = useState<TimelineEpoch[]>(STARTER_TIMELINE.epochs);
  const [viewRange, setViewRange] = useState<TimelineRange | undefined>(timelineRange(STARTER_TIMELINE));
  const [templateId, setTemplateId] = useState<TimelineTemplateId>(DEFAULT_TEMPLATE);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEpochId, setEditingEpochId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>(DEFAULT_EVENT_FORM);
  const [epochForm, setEpochForm] = useState<EpochForm>(DEFAULT_EPOCH_FORM);
  const [status, setStatus] = useState("Línea temporal de ejemplo lista. Guarda para conservarla.");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { load, save, loading, error } = useAppDocument<TimelineDocument>(projectId, "timeline");
  const readOnly = role === "guest";
  const itemsDocument = useMemo<TimelineDocument>(() => ({ events, epochs }), [events, epochs]);
  const eventsRef = useRef(events);
  const epochsRef = useRef(epochs);
  const viewRangeRef = useRef(viewRange);
  const documentRef = useRef(itemsDocument);
  const pendingRangeRef = useRef<TimelineRange | null>(null);
  eventsRef.current = events;
  epochsRef.current = epochs;
  viewRangeRef.current = viewRange;
  documentRef.current = itemsDocument;
  const currentTemplate = TIMELINE_TEMPLATES.find((template) => template.id === templateId) ?? TIMELINE_TEMPLATES[0];

  useEffect(() => {
    let active = true;
    void load().then(({ state }) => {
      if (!active) return;
      const parsed = parseTimelineDocument(state);
      if (parsed) {
        applyDocument(parsed, "Línea temporal guardada cargada.");
      } else {
        setStatus("Línea temporal de ejemplo lista. Guarda para conservarla.");
      }
    });
    return () => { active = false; };
  }, [load]);

  /**
   * Carga un evento en el formulario para editarlo.
   * @param event - Evento seleccionado.
   */
  const startEditEvent = useCallback((event: TimelineEvent) => {
    if (readOnly) return;
    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      groupId: event.groupId,
      start: event.start,
      end: event.end ?? "",
    });
    setStatus(`Editando «${event.title}».`);
  }, [readOnly]);

  /**
   * Carga una época en el formulario para editarla.
   * @param epoch - Época seleccionada.
   */
  const startEditEpoch = useCallback((epoch: TimelineEpoch) => {
    if (readOnly) return;
    setEditingEpochId(epoch.id);
    setEpochForm({
      label: epoch.label,
      start: epoch.start,
      end: epoch.end,
      color: epoch.color,
    });
    setStatus(`Editando la época «${epoch.label}».`);
  }, [readOnly]);

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
          const initialRange = viewRangeRef.current ?? timelineRange(documentRef.current);
          timeline = new Timeline(element, items, groups, {
            ...TIMELINE_OPTIONS,
            ...(initialRange ? {
              start: parseTimelineDate(initialRange.start),
              end: parseTimelineDate(initialRange.end),
            } : {}),
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

          timeline.on("rangechange", (properties) => {
            if (!properties?.start || !properties?.end) return;
            const next = {
              start: toTimelineIsoDate(new Date(properties.start)),
              end: toTimelineIsoDate(new Date(properties.end)),
            };
            setViewRange(next);
            if (properties.byUser && !readOnly) setDirty(true);
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
  }, [readOnly, startEditEpoch, startEditEvent]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    timeline.setItems(buildTimelineItems(itemsDocument));
  }, [itemsDocument]);

  useEffect(() => {
    const timeline = timelineRef.current;
    const range = pendingRangeRef.current;
    if (!timeline || !range) return;
    timeline.setWindow(parseTimelineDate(range.start), parseTimelineDate(range.end));
    pendingRangeRef.current = null;
  }, [events, epochs]);

  /**
   * Aplica un documento validado y programa el rango visible.
   * @param document - Documento que se muestra.
   * @param message - Mensaje de estado.
   */
  function applyDocument(document: TimelineDocument, message: string) {
    const range = document.range ?? timelineRange(document);
    setEvents(document.events);
    setEpochs(document.epochs);
    setViewRange(range);
    pendingRangeRef.current = range ?? null;
    setEditingEventId(null);
    setEditingEpochId(null);
    setEventForm(DEFAULT_EVENT_FORM);
    setEpochForm(DEFAULT_EPOCH_FORM);
    setDirty(false);
    setStatus(message);
  }

  /**
   * Guarda el evento del formulario, creando uno nuevo o actualizando el actual.
   * @param submitEvent - Evento del formulario.
   */
  function saveEvent(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (readOnly) return;
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
    setStatus(editingEventId ? "Evento actualizado. Guarda para conservarlo." : "Evento añadido. Guarda para conservarlo.");
    setDirty(true);
    setEditingEventId(null);
    setEventForm({ ...DEFAULT_EVENT_FORM, groupId: eventForm.groupId });
  }

  /**
   * Elimina un evento de la línea temporal.
   * @param id - Identificador del evento.
   */
  function deleteEvent(id: string) {
    if (readOnly) return;
    const event = events.find((item) => item.id === id);
    setEvents((current) => current.filter((item) => item.id !== id));
    if (editingEventId === id) {
      setEditingEventId(null);
      setEventForm(DEFAULT_EVENT_FORM);
    }
    setDirty(true);
    setStatus(event ? `Evento «${event.title}» eliminado. Guarda para conservarlo.` : "Evento eliminado.");
  }

  /**
   * Guarda la época del formulario, creando una nueva o actualizando la actual.
   * @param submitEvent - Evento del formulario.
   */
  function saveEpoch(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (readOnly) return;
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
    setStatus(editingEpochId ? "Época actualizada. Guarda para conservarla." : "Época añadida. Guarda para conservarla.");
    setDirty(true);
    setEditingEpochId(null);
    setEpochForm(DEFAULT_EPOCH_FORM);
  }

  /**
   * Elimina una época de la línea temporal.
   * @param id - Identificador de la época.
   */
  function deleteEpoch(id: string) {
    if (readOnly) return;
    const epoch = epochs.find((item) => item.id === id);
    setEpochs((current) => current.filter((item) => item.id !== id));
    if (editingEpochId === id) {
      setEditingEpochId(null);
      setEpochForm(DEFAULT_EPOCH_FORM);
    }
    setDirty(true);
    setStatus(epoch ? `Época «${epoch.label}» eliminada. Guarda para conservarla.` : "Época eliminada.");
  }

  /**
   * Aplica una plantilla y reinicia el documento actual.
   */
  function applyTemplate() {
    if (readOnly) return;
    applyDocument(currentTemplate.document, `Plantilla «${currentTemplate.label}» aplicada.`);
    setDirty(true);
  }

  /**
   * Guarda el documento y el rango visible en el proyecto.
   */
  async function saveTimeline() {
    if (readOnly) return;
    setSaving(true);
    const range = viewRange ?? timelineRange({ events, epochs });
    const ok = await save({ events, epochs, range });
    setSaving(false);
    if (ok) {
      setDirty(false);
      setStatus("Línea temporal guardada en el proyecto.");
    } else {
      setStatus("No se pudo guardar la línea temporal. Revisa la conexión.");
    }
  }

  /**
   * Vuelve a cargar el documento guardado.
   */
  async function reloadTimeline() {
    const { state } = await load();
    const parsed = parseTimelineDocument(state);
    if (parsed) {
      applyDocument(parsed, "Línea temporal guardada cargada.");
    } else {
      setStatus("No hay una línea temporal guardada válida; se mantiene la actual.");
    }
  }

  /**
   * Aplica un paso de zoom al lienzo.
   * @param direction - Acercar o alejar.
   */
  function zoom(direction: "in" | "out") {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const options = { animation: { duration: motionDuration(250) } };
    if (direction === "in") timeline.zoomIn(0.3, options);
    else timeline.zoomOut(0.3, options);
    if (!readOnly) setDirty(true);
    setStatus(direction === "in" ? "Vista ampliada." : "Vista reducida.");
  }

  /**
   * Ajusta el rango visible a todos los elementos.
   */
  function fitTimeline() {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const range = timelineWindow(documentRef.current);
    if (range) timeline.setWindow(range.start, range.end);
    if (!readOnly) setDirty(true);
    setStatus("Vista reajustada a toda la línea temporal.");
  }

  /**
   * Desplaza o amplía la línea temporal con el teclado.
   * @param event - Evento de teclado del lienzo.
   */
  function handleTimelineKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const range = timeline.getWindow();
    const span = range.end.getTime() - range.start.getTime();

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowRight": {
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        const shift = span * 0.12 * direction;
        timeline.setWindow(new Date(range.start.getTime() + shift), new Date(range.end.getTime() + shift));
        if (!readOnly) setDirty(true);
        setStatus("Vista desplazada.");
        break;
      }
      case "+":
      case "=":
        event.preventDefault();
        zoom("in");
        return;
      case "-":
      case "_":
        event.preventDefault();
        zoom("out");
        return;
      case "0":
        event.preventDefault();
        fitTimeline();
        return;
      default:
        return;
    }

    event.preventDefault();
  }

  const displayStatus = loading
    ? "Cargando línea temporal…"
    : error ?? status;
  const statusText = dirty && !loading && !error
    ? `${displayStatus} · Cambios sin guardar.`
    : displayStatus;

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
          <button type="button" onClick={() => zoom("in")} aria-label="Acercar" disabled={Boolean(initError)}>
            <ZoomIn size={15} aria-hidden />
            <span>Acercar</span>
          </button>
          <button type="button" onClick={() => zoom("out")} aria-label="Alejar" disabled={Boolean(initError)}>
            <ZoomOut size={15} aria-hidden />
            <span>Alejar</span>
          </button>
          <button type="button" onClick={fitTimeline} aria-label="Recentrar vista" disabled={Boolean(initError)}>
            <RotateCcw size={15} aria-hidden />
            <span>Recentrar</span>
          </button>
          <button type="button" onClick={reloadTimeline} disabled={loading}>
            <FolderOpen size={15} aria-hidden />
            <span>Cargar</span>
          </button>
          <button type="button" onClick={saveTimeline} disabled={readOnly || saving || loading}>
            <Save size={15} aria-hidden />
            <span>{saving ? "Guardando…" : "Guardar"}</span>
          </button>
        </div>
      </header>

      {readOnly ? (
        <p className="timeline-readonly" role="note">
          Modo lectura: puedes explorar la línea temporal, pero no editarla ni guardarla.
        </p>
      ) : null}

      <div className="timeline-layout">
        <section className="timeline-stage" aria-label="Línea temporal">
          <div
            className="timeline-canvas"
            ref={containerRef}
            role="application"
            aria-label="Línea temporal interactiva. Usa las flechas para desplazarte, más y menos para el zoom y cero para recentrar."
            tabIndex={0}
            onKeyDown={handleTimelineKeyDown}
          />
          {initError ? <p className="timeline-fallback" role="alert">{initError}</p> : null}
          <p className="timeline-hint">
            Arrastra el lienzo para moverte y usa la rueda o los botones para cambiar el zoom. Con el lienzo enfocado, las flechas lo desplazan.
          </p>
        </section>

        <aside className="timeline-side">
          <section className="timeline-card timeline-template-card" aria-label="Plantilla">
            <h3>Plantilla</h3>
            <label htmlFor="timeline-template">Modelo
              <select
                id="timeline-template"
                value={templateId}
                onChange={(selectEvent) => setTemplateId(selectEvent.target.value as TimelineTemplateId)}
                disabled={readOnly}
              >
                {TIMELINE_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>{template.label}</option>
                ))}
              </select>
            </label>
            <button type="button" className="timeline-primary" onClick={applyTemplate} disabled={readOnly}>
              Aplicar plantilla
            </button>
            <p className="timeline-template-description">{currentTemplate.description}</p>
          </section>

          <section className="timeline-card" aria-label="Eventos">
            <h3>Eventos</h3>
            <form className="timeline-form" onSubmit={saveEvent}>
              <label htmlFor="timeline-event-title">Título
                <input
                  id="timeline-event-title"
                  value={eventForm.title}
                  onChange={(inputEvent) => setEventForm((current) => ({ ...current, title: inputEvent.target.value }))}
                  placeholder="Nombre del evento"
                  disabled={readOnly}
                />
              </label>
              <label htmlFor="timeline-event-group">Grupo
                <select
                  id="timeline-event-group"
                  value={eventForm.groupId}
                  onChange={(selectEvent) => setEventForm((current) => ({ ...current, groupId: selectEvent.target.value }))}
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
                    onChange={(inputEvent) => setEventForm((current) => ({ ...current, start: inputEvent.target.value }))}
                    disabled={readOnly}
                  />
                </label>
                <label htmlFor="timeline-event-end">Fin (opcional)
                  <input
                    id="timeline-event-end"
                    type="date"
                    value={eventForm.end}
                    onChange={(inputEvent) => setEventForm((current) => ({ ...current, end: inputEvent.target.value }))}
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
                  <button type="button" onClick={() => { setEditingEventId(null); setEventForm(DEFAULT_EVENT_FORM); }} disabled={readOnly}>
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
                    <button type="button" onClick={() => startEditEvent(event)} aria-label={`Editar ${event.title}`} disabled={readOnly}>Editar</button>
                    <button type="button" onClick={() => deleteEvent(event.id)} aria-label={`Eliminar ${event.title}`} disabled={readOnly}>
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
                  disabled={readOnly}
                />
              </label>
              <div className="timeline-date-row">
                <label htmlFor="timeline-epoch-start">Inicio de la época
                  <input
                    id="timeline-epoch-start"
                    type="date"
                    value={epochForm.start}
                    onChange={(inputEvent) => setEpochForm((current) => ({ ...current, start: inputEvent.target.value }))}
                    disabled={readOnly}
                  />
                </label>
                <label htmlFor="timeline-epoch-end">Fin de la época
                  <input
                    id="timeline-epoch-end"
                    type="date"
                    value={epochForm.end}
                    onChange={(inputEvent) => setEpochForm((current) => ({ ...current, end: inputEvent.target.value }))}
                    disabled={readOnly}
                  />
                </label>
              </div>
              <label htmlFor="timeline-epoch-color">Color
                <select
                  id="timeline-epoch-color"
                  value={epochForm.color}
                  onChange={(selectEvent) => setEpochForm((current) => ({ ...current, color: selectEvent.target.value as TimelineEpochColor }))}
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
                  <button type="button" onClick={() => { setEditingEpochId(null); setEpochForm(DEFAULT_EPOCH_FORM); }} disabled={readOnly}>
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
                    <button type="button" onClick={() => startEditEpoch(epoch)} aria-label={`Editar ${epoch.label}`} disabled={readOnly}>Editar</button>
                    <button type="button" onClick={() => deleteEpoch(epoch.id)} aria-label={`Eliminar ${epoch.label}`} disabled={readOnly}>
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
