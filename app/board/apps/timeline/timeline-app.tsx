"use client";

import { useRef } from "react";
import type { StoreRole } from "../types";
import { TimelineSidePanel } from "./timeline-side-panel";
import { TimelineToolbar } from "./timeline-toolbar";
import { useTimelineCanvas } from "./use-timeline-canvas";
import { useTimelineEditor } from "./use-timeline-editor";
import "./timeline.css";

/**
 * Líneas de tiempo: eventos, épocas, grupos, zoom y persistencia por proyecto.
 * @param props - Proyecto activo y rol del usuario.
 * @returns La ventana con el lienzo temporal y el panel de edición.
 */
export default function TimelineApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editor = useTimelineEditor(projectId, role);
  const canvas = useTimelineCanvas({
    containerRef,
    document: editor.timelineDocument,
    viewRange: editor.viewRange,
    pendingRange: editor.pendingRange,
    readOnly: editor.readOnly,
    onRangeChange: editor.setViewRange,
    onMarkDirty: editor.markDirty,
    onStatus: editor.setStatus,
    onClearPendingRange: editor.clearPendingRange,
    onEditEvent: editor.startEditEvent,
    onEditEpoch: editor.startEditEpoch,
  });

  const displayStatus = editor.loading
    ? "Cargando línea temporal…"
    : editor.error ?? editor.status;
  const statusText = editor.dirty && !editor.loading && !editor.error
    ? `${displayStatus} · Cambios sin guardar.`
    : displayStatus;

  return (
    <div className="timeline-app">
      <TimelineToolbar
        initError={canvas.initError}
        loading={editor.loading}
        readOnly={editor.readOnly}
        saving={editor.saving}
        onZoomIn={canvas.zoomIn}
        onZoomOut={canvas.zoomOut}
        onFit={canvas.fitTimeline}
        onReload={editor.reloadTimeline}
        onSave={editor.saveTimeline}
      />

      {editor.readOnly ? (
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
            onKeyDown={canvas.handleTimelineKeyDown}
          />
          {canvas.initError ? <p className="timeline-fallback" role="alert">{canvas.initError}</p> : null}
          <p className="timeline-hint">
            Arrastra el lienzo para moverte y usa la rueda o los botones para cambiar el zoom. Con el lienzo enfocado, las flechas lo desplazan.
          </p>
        </section>

        <TimelineSidePanel
          currentTemplate={editor.currentTemplate}
          templateId={editor.templateId}
          events={editor.events}
          epochs={editor.epochs}
          eventForm={editor.eventForm}
          epochForm={editor.epochForm}
          editingEventId={editor.editingEventId}
          editingEpochId={editor.editingEpochId}
          readOnly={editor.readOnly}
          statusText={statusText}
          onTemplateChange={editor.setTemplateId}
          onApplyTemplate={editor.applyTemplate}
          onEventFormChange={editor.setEventForm}
          onEpochFormChange={editor.setEpochForm}
          onSaveEvent={editor.saveEvent}
          onSaveEpoch={editor.saveEpoch}
          onEditEvent={editor.startEditEvent}
          onEditEpoch={editor.startEditEpoch}
          onDeleteEvent={editor.deleteEvent}
          onDeleteEpoch={editor.deleteEpoch}
          onCancelEvent={editor.cancelEventEdit}
          onCancelEpoch={editor.cancelEpochEdit}
        />
      </div>
    </div>
  );
}
