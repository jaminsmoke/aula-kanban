"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { TimelineEpochsCard } from "./timeline-epochs-card";
import { TimelineEventsCard } from "./timeline-events-card";
import { TimelineTemplateCard } from "./timeline-template-card";
import type { TimelineTemplate, TimelineTemplateId, TimelineEpoch, TimelineEvent } from "./timeline-model";
import type { TimelineEpochForm, TimelineEventForm } from "./use-timeline-editor";

type TimelineSidePanelProps = {
  currentTemplate: TimelineTemplate;
  templateId: TimelineTemplateId;
  events: TimelineEvent[];
  epochs: TimelineEpoch[];
  eventForm: TimelineEventForm;
  epochForm: TimelineEpochForm;
  editingEventId: string | null;
  editingEpochId: string | null;
  readOnly: boolean;
  statusText: string;
  onTemplateChange: (templateId: TimelineTemplateId) => void;
  onApplyTemplate: () => void;
  onEventFormChange: Dispatch<SetStateAction<TimelineEventForm>>;
  onEpochFormChange: Dispatch<SetStateAction<TimelineEpochForm>>;
  onSaveEvent: (event: FormEvent<HTMLFormElement>) => void;
  onSaveEpoch: (event: FormEvent<HTMLFormElement>) => void;
  onEditEvent: (event: TimelineEvent) => void;
  onEditEpoch: (epoch: TimelineEpoch) => void;
  onDeleteEvent: (id: string) => void;
  onDeleteEpoch: (id: string) => void;
  onCancelEvent: () => void;
  onCancelEpoch: () => void;
};

/**
 * Panel lateral con plantilla, eventos y épocas.
 * @param props - Estado del editor y acciones.
 * @returns El panel de edición.
 */
export function TimelineSidePanel({
  currentTemplate,
  templateId,
  events,
  epochs,
  eventForm,
  epochForm,
  editingEventId,
  editingEpochId,
  readOnly,
  statusText,
  onTemplateChange,
  onApplyTemplate,
  onEventFormChange,
  onEpochFormChange,
  onSaveEvent,
  onSaveEpoch,
  onEditEvent,
  onEditEpoch,
  onDeleteEvent,
  onDeleteEpoch,
  onCancelEvent,
  onCancelEpoch,
}: TimelineSidePanelProps) {
  return (
    <aside className="timeline-side">
      <TimelineTemplateCard
        currentTemplate={currentTemplate}
        templateId={templateId}
        readOnly={readOnly}
        onTemplateChange={onTemplateChange}
        onApply={onApplyTemplate}
      />
      <TimelineEventsCard
        events={events}
        eventForm={eventForm}
        editingEventId={editingEventId}
        readOnly={readOnly}
        statusText={statusText}
        onFormChange={onEventFormChange}
        onSave={onSaveEvent}
        onEdit={onEditEvent}
        onDelete={onDeleteEvent}
        onCancel={onCancelEvent}
      />
      <TimelineEpochsCard
        epochs={epochs}
        epochForm={epochForm}
        editingEpochId={editingEpochId}
        readOnly={readOnly}
        onFormChange={onEpochFormChange}
        onSave={onSaveEpoch}
        onEdit={onEditEpoch}
        onDelete={onDeleteEpoch}
        onCancel={onCancelEpoch}
      />
    </aside>
  );
}
