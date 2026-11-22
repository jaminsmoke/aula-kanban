"use client";

import { Suspense, lazy, type ComponentProps } from "react";
import { GraduationCap, LayoutGrid, Users } from "lucide-react";
import type { AdministracionSection } from "../../shared/board-url";
import type { StoreRole } from "../../store/tools";
import WorkspaceLayout, { type WorkspaceItem } from "../../shared/ui/workspace-layout";
import StudentsView from "../students/students-view";
import TeachersView from "../teachers/teachers-view";

const StoreDesktop = lazy(() => import("../../store/store-desktop"));

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
export default function AdministrationView({ section, onSection, students, teachers, tienda, onAppClose }: {
  section: AdministracionSection;
  onSection: (section: AdministracionSection) => void;
  students: ComponentProps<typeof StudentsView>;
  teachers: ComponentProps<typeof TeachersView>;
  tienda: { role: StoreRole; projectId: string };
  onAppClose?: (appId: string) => void;
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
            <StoreDesktop role={tienda.role} projectId={tienda.projectId} onAppClose={onAppClose} />
          </Suspense>
        )}
      </div>
    </WorkspaceLayout>
  );
}
