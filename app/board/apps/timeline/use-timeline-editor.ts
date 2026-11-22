"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { StoreRole } from "../types";
import { useAppDocument } from "../use-app-document";
import {
  STARTER_TIMELINE,
  TIMELINE_GROUPS,
  TIMELINE_TEMPLATES,
  isValidTimelineRange,
  parseTimelineDocument,
  timelineRange,
  type TimelineDocument,
  type TimelineEpoch,
  type TimelineEpochColor,
  type TimelineEvent,
  type TimelineRange,
  type TimelineTemplateId,
} from "./timeline-model";

/** Estado editable de un evento. */
export type TimelineEventForm = {
  title: string;
  groupId: string;
  start: string;
  end: string;
};

/** Estado editable de una época. */
export type TimelineEpochForm = {
  label: string;
  start: string;
  end: string;
  color: TimelineEpochColor;
};

const DEFAULT_EVENT_FORM: TimelineEventForm = {
  title: "",
  groupId: TIMELINE_GROUPS[0].id,
  start: "1960-01-01",
  end: "",
};

const DEFAULT_EPOCH_FORM: TimelineEpochForm = {
  label: "",
  start: "1960-01-01",
  end: "1970-01-01",
  color: "violet",
};

const DEFAULT_TEMPLATE: TimelineTemplateId = "espacial";

/**
 * Genera un identificador local para un evento o una época.
 * @param prefix - Prefijo legible.
 * @returns Identificador único dentro de la sesión.
 */
function createTimelineId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Estado y acciones de edición de una línea temporal.
 * @param projectId - Proyecto activo.
 * @param role - Rol del usuario.
 * @returns Documento, formularios y acciones de persistencia.
 */
export function useTimelineEditor(projectId: string, role: StoreRole) {
  const [events, setEvents] = useState<TimelineEvent[]>(STARTER_TIMELINE.events);
  const [epochs, setEpochs] = useState<TimelineEpoch[]>(STARTER_TIMELINE.epochs);
  const [viewRange, setViewRange] = useState<TimelineRange | undefined>(timelineRange(STARTER_TIMELINE));
  const [templateId, setTemplateId] = useState<TimelineTemplateId>(DEFAULT_TEMPLATE);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEpochId, setEditingEpochId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<TimelineEventForm>(DEFAULT_EVENT_FORM);
  const [epochForm, setEpochForm] = useState<TimelineEpochForm>(DEFAULT_EPOCH_FORM);
  const [status, setStatus] = useState("Línea temporal de ejemplo lista. Guarda para conservarla.");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingRange, setPendingRange] = useState<TimelineRange | null>(null);
  const { load, saveCurrentVersioned, loadFailed, markLoadFailed, loading, error } =
    useAppDocument<TimelineDocument>(projectId, "timeline");
  const readOnly = role === "guest";
  const timelineDocument = useMemo<TimelineDocument>(() => ({ events, epochs }), [events, epochs]);
  const currentTemplate = TIMELINE_TEMPLATES.find((template) => template.id === templateId) ?? TIMELINE_TEMPLATES[0];

  const applyDocument = useCallback((nextDocument: TimelineDocument, message: string) => {
    const range = nextDocument.range ?? timelineRange(nextDocument);
    setEvents(nextDocument.events);
    setEpochs(nextDocument.epochs);
    setViewRange(range);
    setPendingRange(range ?? null);
    setEditingEventId(null);
    setEditingEpochId(null);
    setEventForm(DEFAULT_EVENT_FORM);
    setEpochForm(DEFAULT_EPOCH_FORM);
    setDirty(false);
    setStatus(message);
  }, []);

  useEffect(() => {
    let active = true;
    void load().then(({ state, ok }) => {
      if (!active) return;
      if (ok === false) {
        setStatus("No se pudo cargar la línea temporal. Se conserva la actual.");
        return;
      }
      const parsed = parseTimelineDocument(state);
      if (parsed) {
        applyDocument(parsed, "Línea temporal guardada cargada.");
      } else if (state === null) {
        setStatus("Línea temporal de ejemplo lista. Guarda para conservarla.");
      } else {
        markLoadFailed();
        setStatus("La línea temporal guardada no es válida. Se conserva la actual.");
      }
    });
    return () => { active = false; };
  }, [applyDocument, load, markLoadFailed]);

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
    if (loadFailed) {
      setStatus("No se puede guardar hasta recuperar la línea temporal guardada.");
      return;
    }
    setSaving(true);
    const range = viewRange ?? timelineRange({ events, epochs });
    const result = await saveCurrentVersioned({ events, epochs, range });
    setSaving(false);
    if (result.status === "saved") {
      setDirty(false);
      setStatus("Línea temporal guardada en el proyecto.");
    } else if (result.status === "conflict") {
      setDirty(true);
      setStatus("La línea temporal ha cambiado en otra sesión. Tus cambios siguen aquí.");
    } else {
      setStatus("No se pudo guardar la línea temporal. Revisa la conexión.");
    }
  }

  /**
   * Vuelve a cargar el documento guardado.
   */
  async function reloadTimeline() {
    if (dirty && typeof window !== "undefined" && !window.confirm(
      "Hay cambios sin guardar. ¿Cargar la versión guardada y descartar los cambios locales?",
    )) {
      return;
    }
    const { state, ok } = await load();
    if (ok === false) {
      setStatus("No se pudo cargar la línea temporal. Se conserva la actual.");
      return;
    }
    const parsed = parseTimelineDocument(state);
    if (parsed) {
      applyDocument(parsed, "Línea temporal guardada cargada.");
    } else if (state === null) {
      setStatus("No hay una línea temporal guardada; se mantiene la actual.");
    } else {
      markLoadFailed();
      setStatus("La línea temporal guardada no es válida; se mantiene la actual.");
    }
  }

  const cancelEventEdit = useCallback(() => {
    setEditingEventId(null);
    setEventForm(DEFAULT_EVENT_FORM);
  }, []);

  const cancelEpochEdit = useCallback(() => {
    setEditingEpochId(null);
    setEpochForm(DEFAULT_EPOCH_FORM);
  }, []);

  const markDirty = useCallback(() => setDirty(true), []);
  const clearPendingRange = useCallback(() => setPendingRange(null), []);

  return {
    events,
    epochs,
    viewRange,
    setViewRange,
    templateId,
    setTemplateId,
    currentTemplate,
    editingEventId,
    editingEpochId,
    eventForm,
    setEventForm,
    epochForm,
    setEpochForm,
    status,
    setStatus,
    dirty,
    markDirty,
    saving,
    loading,
    error,
    readOnly,
    timelineDocument,
    pendingRange,
    clearPendingRange,
    startEditEvent,
    startEditEpoch,
    saveEvent,
    deleteEvent,
    saveEpoch,
    deleteEpoch,
    cancelEventEdit,
    cancelEpochEdit,
    applyTemplate,
    saveTimeline,
    reloadTimeline,
  };
}
