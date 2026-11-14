"use client";

import type { ComponentProps } from "react";
import { Columns3 } from "lucide-react";
import WorkspaceLayout, { type WorkspaceItem } from "../layout/workspace-layout";
import KanbanView from "../tasks/kanban-view";
import "./class.css";

/** Secciones disponibles dentro de Clase. */
export type ClassSection = "tareas";

const SECTIONS: WorkspaceItem<ClassSection>[] = [
  { id: "tareas", label: "Tareas", icon: Columns3 },
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
        {section === "tareas" ? <KanbanView {...kanban} /> : null}
      </div>
    </WorkspaceLayout>
  );
}
