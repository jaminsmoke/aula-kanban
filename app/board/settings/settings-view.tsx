"use client";

import { useState } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import WorkspaceLayout, { type WorkspaceItem } from "../layout/workspace-layout";
import type { Project } from "../shared/model";
import SettingsAccount from "./settings-account";
import SettingsAdmins from "./settings-admins";
import SettingsStorage from "./settings-storage";
import "./settings-view.css";

/** Secciones disponibles dentro de Ajustes (tipo canónico en `lib/domain/board-url`). */
export type { SettingsSection } from "../../../lib/domain/board-url";
import type { SettingsSection } from "../../../lib/domain/board-url";

/**
 * Vista de ajustes generales con sidebar y secciones.
 * @param props - Cuenta, permisos, proyecto activo y recarga de proyectos.
 * @returns La página de ajustes.
 */
export default function SettingsView({ user, projectsLoaded, owner, admin, activeProject, onProjectsChanged, section: controlledSection, onSection }: {
  user: { displayName: string; email: string };
  projectsLoaded: boolean;
  owner: boolean;
  admin: boolean;
  activeProject?: Project;
  onProjectsChanged: () => void;
  section?: SettingsSection;
  onSection?: (section: SettingsSection) => void;
}) {
  const [innerSection, setInnerSection] = useState<SettingsSection>("cuenta");
  const section = controlledSection ?? innerSection;
  const setSection = onSection ?? setInnerSection;
  const privileged = owner || admin;
  const sections: WorkspaceItem<SettingsSection>[] = [
    { id: "cuenta", label: "Cuenta", icon: UserRound },
    ...(privileged ? [{ id: "administradores" as const, label: "Administradores", icon: ShieldCheck }] : []),
  ];
  const active = privileged ? section : "cuenta";

  return (
    <WorkspaceLayout title="Ajustes" label="Secciones de ajustes" items={sections} active={active} onSelect={setSection}>
      <div className="settings-content">
        {active === "cuenta" ? (
          <SettingsAccount user={user} projectsLoaded={projectsLoaded} owner={owner} admin={admin} activeProject={activeProject} />
        ) : (
          <>
            <SettingsAdmins onProjectsChanged={onProjectsChanged} />
            <SettingsStorage />
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
