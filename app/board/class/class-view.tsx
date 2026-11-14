"use client";

import { Suspense, lazy } from "react";
import type { ComponentProps } from "react";
import { CalendarDays, Columns3 } from "lucide-react";
import WorkspaceLayout, { type WorkspaceItem } from "../layout/workspace-layout";
import KanbanView from "../tasks/kanban-view";
import "./class.css";

// El calendario solo se descarga al abrir su sección.
const CalendarView = lazy(() => import("./calendar/calendar-view"));

/** Secciones disponibles dentro de Clase. */
export type ClassSection = "tareas" | "calendario";

const SECTIONS: WorkspaceItem<ClassSection>[] = [
  { id: "tareas", label: "Tareas", icon: Columns3 },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
];

/**
 * Shell de Clase: sidebar de secciones y contenido de la sección activa.
 * @param props - Sección activa, cambio de sección y props del tablero.
 * @returns La vista de clase.
 */
export default function ClassView({ section, onSection, kanban }: {
  section: ClassSection;
  onSection: (section: ClassSection) => void;
  kanban: ComponentProps<typeof KanbanView>;
}) {
  return (
    <WorkspaceLayout title="Clase" label="Secciones de clase" items={SECTIONS} active={section} onSelect={onSection}>
      <div className="class-content">
        {section === "tareas" ? (
          <KanbanView {...kanban} />
        ) : (
          <Suspense fallback={<div className="class-section-loading" role="status">Cargando el calendario…</div>}>
            <CalendarView
              tasks={kanban.tasks}
              loadError={kanban.loadError}
              onRetry={kanban.onRetry}
              onOpenTask={(task) => kanban.onOpenEditor(task.status, task)}
            />
          </Suspense>
        )}
      </div>
    </WorkspaceLayout>
  );
}
