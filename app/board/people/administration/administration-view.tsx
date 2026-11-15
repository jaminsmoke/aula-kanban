"use client";

import type { ComponentProps } from "react";
import { GraduationCap, Users } from "lucide-react";
import type { AdministracionSection } from "../../shared/board-url";
import WorkspaceLayout, { type WorkspaceItem } from "../../layout/workspace-layout";
import StudentsView from "../students/students-view";
import TeachersView from "../teachers/teachers-view";

const sections: WorkspaceItem<AdministracionSection>[] = [
  { id: "alumnos", label: "Alumnos", icon: Users },
  { id: "profesores", label: "Profesores", icon: GraduationCap },
];

/**
 * Vista de administración con el sidebar de alumnado y profesorado.
 * @param props - Sección activa, su setter y las props de cada vista.
 * @returns El workspace con la sección elegida.
 */
export default function AdministrationView({ section, onSection, students, teachers }: {
  section: AdministracionSection;
  onSection: (section: AdministracionSection) => void;
  students: ComponentProps<typeof StudentsView>;
  teachers: ComponentProps<typeof TeachersView>;
}) {
  return (
    <WorkspaceLayout title="Administración" label="Secciones de administración" items={sections} active={section} onSelect={onSection}>
      <div className="administration-content">
        {section === "alumnos" ? <StudentsView {...students} /> : <TeachersView {...teachers} />}
      </div>
    </WorkspaceLayout>
  );
}
