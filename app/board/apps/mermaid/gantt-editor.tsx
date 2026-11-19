"use client";

import { Plus, Trash2 } from "lucide-react";
import { createGanttTask, type GanttDocument, type GanttSection, type GanttTask } from "./gantt-model";

/** Propiedades del formulario de contenido de Gantt. */
export type GanttEditorProps = {
  value: GanttDocument;
  onChange: (value: GanttDocument) => void;
  readOnly: boolean;
};

/**
 * Editor de contenido para Gantt: mantiene la estructura Mermaid y permite
 * cambiar título, secciones, nombres, fechas y duraciones.
 * @param props - Documento, cambio y estado de lectura.
 * @returns El formulario de contenido.
 */
export default function GanttEditor({ value, onChange, readOnly }: GanttEditorProps) {
  const allTasks = value.sections.flatMap((section) => section.tasks);

  function updateTask(sectionIndex: number, taskIndex: number, patch: Partial<GanttTask>) {
    const sections = value.sections.map((section, index) => index !== sectionIndex
      ? section
      : { ...section, tasks: section.tasks.map((task, index) => index === taskIndex ? { ...task, ...patch } : task) });
    onChange({ ...value, sections });
  }

  function detachMissing(sections: GanttSection[], removed: Set<string>): GanttSection[] {
    return sections.map((section) => ({
      ...section,
      tasks: section.tasks.map((task) => removed.has(task.afterId)
        ? { ...task, startMode: "date", afterId: "" }
        : task),
    }));
  }

  function removeTask(sectionIndex: number, taskIndex: number) {
    const removed = value.sections[sectionIndex].tasks[taskIndex].id;
    const sections = value.sections.map((section, index) => index === sectionIndex
      ? { ...section, tasks: section.tasks.filter((_, index) => index !== taskIndex) }
      : section);
    onChange({ ...value, sections: detachMissing(sections, new Set([removed])) });
  }

  function addTask(sectionIndex: number) {
    const task = createGanttTask(allTasks);
    const sections = value.sections.map((section, index) => index === sectionIndex
      ? { ...section, tasks: [...section.tasks, task] }
      : section);
    onChange({ ...value, sections });
  }

  function addSection() {
    const numbers = value.sections.map((section) => Number(section.id.replace("section-", "")) || 0);
    const section: GanttSection = {
      id: `section-${Math.max(0, ...numbers) + 1}`,
      name: "Nueva sección",
      tasks: [],
    };
    onChange({ ...value, sections: [...value.sections, section] });
  }

  function removeSection(sectionIndex: number) {
    const removed = new Set(value.sections[sectionIndex].tasks.map((task) => task.id));
    const sections = value.sections.filter((_, index) => index !== sectionIndex);
    onChange({ ...value, sections: detachMissing(sections, removed) });
  }

  return (
    <div className="gantt-editor">
      <p className="gantt-editor-intro">
        Edita el contenido; Mermaid genera las palabras clave y la estructura por ti.
      </p>
      <label className="gantt-field">
        <span>Título</span>
        <input
          value={value.title}
          readOnly={readOnly}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
          aria-label="Título del Gantt"
          placeholder="Plan de proyecto"
        />
      </label>
      <div className="gantt-sections">
        {value.sections.map((section, sectionIndex) => (
          <section className="gantt-section" key={section.id}>
            <div className="gantt-section-head">
              <label className="gantt-field">
                <span>Sección</span>
                <input
                  value={section.name}
                  readOnly={readOnly}
                  onChange={(event) => onChange({
                    ...value,
                    sections: value.sections.map((item, index) => index === sectionIndex
                      ? { ...item, name: event.target.value }
                      : item),
                  })}
                  aria-label={`Nombre de la sección ${sectionIndex + 1}`}
                  placeholder="Investigación"
                />
              </label>
              {!readOnly ? (
                <button
                  type="button"
                  className="gantt-icon-button"
                  onClick={() => removeSection(sectionIndex)}
                  aria-label={`Eliminar sección ${sectionIndex + 1}`}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              ) : null}
            </div>

            {section.tasks.map((task, taskIndex) => {
              const otherTasks = allTasks.filter((item) => item.id !== task.id);
              return (
                <article className="gantt-task" key={task.id}>
                  <div className="gantt-task-head">
                    <strong>Tarea {taskIndex + 1}</strong>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="gantt-icon-button"
                        onClick={() => removeTask(sectionIndex, taskIndex)}
                        aria-label={`Eliminar tarea ${taskIndex + 1} de la sección ${sectionIndex + 1}`}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  <label className="gantt-field">
                    <span>Nombre</span>
                    <input
                      value={task.name}
                      readOnly={readOnly}
                      onChange={(event) => updateTask(sectionIndex, taskIndex, { name: event.target.value })}
                      aria-label={`Nombre de la tarea ${taskIndex + 1} de la sección ${sectionIndex + 1}`}
                      placeholder="Tarea"
                    />
                  </label>
                  <div className="gantt-task-grid">
                    <label className="gantt-field">
                      <span>Inicio</span>
                      <select
                        value={task.startMode}
                        disabled={readOnly}
                        onChange={(event) => {
                          const startMode = event.target.value as "date" | "after";
                          updateTask(sectionIndex, taskIndex, {
                            startMode,
                            startDate: task.startDate || "2026-01-01",
                            afterId: startMode === "after" ? otherTasks[0]?.id ?? "" : task.afterId,
                          });
                        }}
                        aria-label={`Modo de inicio de la tarea ${taskIndex + 1} de la sección ${sectionIndex + 1}`}
                      >
                        <option value="date">Fecha</option>
                        <option value="after">Después de</option>
                      </select>
                    </label>
                    {task.startMode === "date" ? (
                      <label className="gantt-field">
                        <span>Fecha</span>
                        <input
                          type="date"
                          value={task.startDate}
                          readOnly={readOnly}
                          onChange={(event) => updateTask(sectionIndex, taskIndex, { startDate: event.target.value })}
                          aria-label={`Fecha de la tarea ${taskIndex + 1} de la sección ${sectionIndex + 1}`}
                        />
                      </label>
                    ) : (
                      <label className="gantt-field">
                        <span>Tarea previa</span>
                        <select
                          value={otherTasks.some((item) => item.id === task.afterId) ? task.afterId : ""}
                          disabled={readOnly}
                          onChange={(event) => updateTask(sectionIndex, taskIndex, { afterId: event.target.value })}
                          aria-label={`Tarea previa de la tarea ${taskIndex + 1} de la sección ${sectionIndex + 1}`}
                        >
                          <option value="">Elegir tarea…</option>
                          {otherTasks.map((item) => (
                            <option value={item.id} key={item.id}>{item.name || item.id}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="gantt-field">
                      <span>Duración</span>
                      <input
                        value={task.duration}
                        readOnly={readOnly}
                        onChange={(event) => updateTask(sectionIndex, taskIndex, { duration: event.target.value })}
                        aria-label={`Duración de la tarea ${taskIndex + 1} de la sección ${sectionIndex + 1}`}
                        placeholder="5d"
                      />
                    </label>
                  </div>
                </article>
              );
            })}

            {!readOnly ? (
              <button type="button" className="gantt-add gantt-add-task" onClick={() => addTask(sectionIndex)}>
                <Plus size={14} aria-hidden />
                Añadir tarea
              </button>
            ) : null}
          </section>
        ))}
      </div>
      {!readOnly ? (
        <button type="button" className="gantt-add" onClick={addSection}>
          <Plus size={14} aria-hidden />
          Añadir sección
        </button>
      ) : null}
    </div>
  );
}
