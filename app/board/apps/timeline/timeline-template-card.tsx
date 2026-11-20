"use client";

import { TIMELINE_TEMPLATES, type TimelineTemplate, type TimelineTemplateId } from "./timeline-model";

type TimelineTemplateCardProps = {
  currentTemplate: TimelineTemplate;
  templateId: TimelineTemplateId;
  readOnly: boolean;
  onTemplateChange: (templateId: TimelineTemplateId) => void;
  onApply: () => void;
};

/**
 * Selector de plantilla y resumen del modelo activo.
 * @param props - Plantilla actual y acciones.
 * @returns La tarjeta de plantilla.
 */
export function TimelineTemplateCard({
  currentTemplate,
  templateId,
  readOnly,
  onTemplateChange,
  onApply,
}: TimelineTemplateCardProps) {
  return (
    <section className="timeline-card timeline-template-card" aria-label="Plantilla">
      <h3>Plantilla</h3>
      <label htmlFor="timeline-template">Modelo
        <select
          id="timeline-template"
          value={templateId}
          onChange={(selectEvent) => onTemplateChange(selectEvent.target.value as TimelineTemplateId)}
          disabled={readOnly}
        >
          {TIMELINE_TEMPLATES.map((template) => (
            <option key={template.id} value={template.id}>{template.label}</option>
          ))}
        </select>
      </label>
      <button type="button" className="timeline-primary" onClick={onApply} disabled={readOnly}>
        Aplicar plantilla
      </button>
      <p className="timeline-template-description">{currentTemplate.description}</p>
    </section>
  );
}
