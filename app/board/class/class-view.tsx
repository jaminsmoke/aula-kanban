"use client";

import { Suspense, lazy } from "react";
import type { ComponentProps } from "react";
import { Backpack, Briefcase, CalendarDays, Columns3 } from "lucide-react";
import WorkspaceLayout, { type WorkspaceItem } from "../shared/ui/workspace-layout";
import KanbanView from "../tasks/kanban-view";
import type { StoreRole } from "../store/tools";
import "./class.css";

// El calendario y el espacio personal solo se descargan al abrirlos.
const CalendarView = lazy(() => import("./calendar/calendar-view"));
const PersonalSpaceView = lazy(() => import("./personal-space-view"));

/** Secciones disponibles dentro de Clase (tipo canónico en `lib/domain/board-url`). */
export type { ClassSection } from "../../../lib/domain/board-url";
import type { ClassSection } from "../../../lib/domain/board-url";

const SECTIONS: WorkspaceItem<ClassSection>[] = [
  { id: "tareas", label: "Tareas", icon: Columns3 },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
];

/**
 * Items de Clase, con la sección personal según el rol: «Maletín» para
 * profesorado y «Mi mochila» para el resto.
 * @param role - Rol en el proyecto activo.
 * @returns La lista de secciones de la vista Clase.
 */
function sectionsFor(role: StoreRole): WorkspaceItem<ClassSection>[] {
  return [
    ...SECTIONS,
    role === "teacher"
      ? { id: "mochila", label: "Maletín", icon: Briefcase }
      : { id: "mochila", label: "Mi mochila", icon: Backpack },
  ];
}

/**
 * Shell de Clase: sidebar de secciones y contenido de la sección activa.
 * @param props - Sección activa, cambio de sección, props del tablero y
 *   datos del espacio personal (mochila del alumnado y maletín docente).
 * @returns La vista de clase.
 */
export default function ClassView({ section, onSection, kanban, role, projectId }: {
  section: ClassSection;
  onSection: (section: ClassSection) => void;
  kanban: ComponentProps<typeof KanbanView>;
  role: StoreRole;
  projectId: string;
}) {
  return (
    <WorkspaceLayout title="Clase" label="Secciones de clase" items={sectionsFor(role)} active={section} onSelect={onSection}>
      <div className={section === "mochila" ? "class-content class-content--desktop" : "class-content"}>
        {section === "mochila" ? (
          <Suspense fallback={<div className="class-section-loading" role="status">Cargando tu espacio…</div>}>
            <PersonalSpaceView role={role} projectId={projectId} />
          </Suspense>
        ) : section === "tareas" ? (
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
