"use client";

import { Suspense, lazy, type ComponentProps } from "react";
import { GraduationCap, LayoutGrid, Users } from "lucide-react";
import type { AdministracionSection } from "../../shared/board-url";
import type { SpaceRole } from "../../space/tools";
import WorkspaceLayout, { type WorkspaceItem } from "../../layout/workspace-layout";
import StudentsView from "../students/students-view";
import TeachersView from "../teachers/teachers-view";

const SpaceView = lazy(() => import("../../space/space-view"));

const sections: WorkspaceItem<AdministracionSection>[] = [
  { id: "alumnos", label: "Alumnos", icon: Users },
  { id: "profesores", label: "Profesores", icon: GraduationCap },
  { id: "tienda", label: "Tienda", icon: LayoutGrid },
];

/**
 * Vista de administración con el sidebar de alumnado, profesorado y Tienda.
 * @param props - Sección activa, su setter y las props de cada vista.
 * @returns El workspace con la sección elegida.
 */
export default function AdministrationView({ section, onSection, students, teachers, tienda }: {
  section: AdministracionSection;
  onSection: (section: AdministracionSection) => void;
  students: ComponentProps<typeof StudentsView>;
  teachers: ComponentProps<typeof TeachersView>;
  tienda: { role: SpaceRole; projectId: string };
}) {
  return (
    <WorkspaceLayout
      title="Administración"
      label="Secciones de administración"
      items={sections}
      active={section}
      onSelect={onSection}
      hideMobileTitle
    >
      <div className={`administration-content${section === "tienda" ? " administration-content--store" : ""}`}>
        {section === "alumnos" ? (
          <StudentsView {...students} />
        ) : section === "profesores" ? (
          <TeachersView {...teachers} />
        ) : (
          <Suspense fallback={<div className="access-loading" role="status">Cargando Tienda…</div>}>
            <SpaceView role={tienda.role} projectId={tienda.projectId} />
          </Suspense>
        )}
      </div>
    </WorkspaceLayout>
  );
}
