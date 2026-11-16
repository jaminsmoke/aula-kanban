"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { BookOpen, HardDrive, KeyRound, Lock, Palette, ShieldCheck, UserRound } from "lucide-react";
import WorkspaceLayout, { type WorkspaceItem } from "../layout/workspace-layout";
import type { Project } from "../shared/model";
import SettingsAccount from "./settings-account";
import SettingsAdmins from "./settings-admins";
import SettingsAppearance from "./settings-appearance";
import SettingsPermissions from "./settings-permissions";
import SettingsStorage from "./settings-storage";
import SettingsTokens from "./settings-tokens";
import "./settings-view.css";

// La ayuda solo se descarga al abrir su sección.
const DocumentationView = lazy(() => import("../docs/docs-view"));

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
  const restricted = section === "administradores" || section === "permisos" || section === "almacenamiento";
  const sections: WorkspaceItem<SettingsSection>[] = [
    { id: "cuenta", label: "Cuenta", icon: UserRound },
    { id: "apariencia", label: "Apariencia", icon: Palette },
    { id: "documentacion", label: "Documentación", icon: BookOpen },
    { id: "tokens", label: "Tokens MCP", icon: KeyRound },
    ...(privileged ? [
      { id: "administradores" as const, label: "Administradores", icon: ShieldCheck },
      { id: "permisos" as const, label: "Permisos", icon: Lock },
      { id: "almacenamiento" as const, label: "Almacenamiento", icon: HardDrive },
    ] : []),
  ];
  const active = !privileged && restricted ? "cuenta" : section;

  useEffect(() => {
    if (privileged || !restricted) return;
    // Quita la sección restringida sin añadir una entrada al historial:
    // el setter normal de la URL usa pushState y rompería atrás/adelante.
    const url = new URL(window.location.href);
    url.searchParams.set("view", "ajustes");
    url.searchParams.delete("section");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setSection("cuenta");
  }, [privileged, restricted, setSection]);

  return (
    <WorkspaceLayout title="Ajustes" label="Secciones de ajustes" items={sections} active={active} onSelect={setSection}>
      <div className="settings-content">
        {active === "cuenta" ? (
          <SettingsAccount user={user} projectsLoaded={projectsLoaded} owner={owner} admin={admin} activeProject={activeProject} />
        ) : active === "apariencia" ? (
          <SettingsAppearance />
        ) : active === "documentacion" ? (
          <Suspense fallback={<div className="settings-docs-loading" role="status">Cargando la documentación…</div>}>
            <div className="settings-docs"><DocumentationView /></div>
          </Suspense>
        ) : active === "tokens" ? (
          <SettingsTokens />
        ) : active === "administradores" ? (
          <SettingsAdmins onProjectsChanged={onProjectsChanged} />
        ) : active === "permisos" ? (
          <SettingsPermissions />
        ) : (
          <SettingsStorage />
        )}
      </div>
    </WorkspaceLayout>
  );
}
