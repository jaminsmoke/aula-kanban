"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { BookOpen, Globe, HardDrive, KeyRound, Lock, Palette, ShieldCheck, UserRound } from "lucide-react";
import WorkspaceLayout, { type WorkspaceItem } from "../shared/ui/workspace-layout";
import type { Project } from "../shared/model";
import SettingsAccount from "./settings-account";
import SettingsAdmins from "./settings-admins";
import SettingsAppearance from "./settings-appearance";
import SettingsPermissions from "./settings-permissions";
import SettingsSite from "./settings-site";
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
export default function SettingsView({ user, projectsLoaded, owner, admin, guest = false, activeProject, onProjectsChanged, onRemix, section: controlledSection, onSection }: {
  user: { displayName: string; email: string };
  projectsLoaded: boolean;
  owner: boolean;
  admin: boolean;
  guest?: boolean;
  activeProject?: Project;
  onProjectsChanged: () => void;
  onRemix: () => void;
  section?: SettingsSection;
  onSection?: (section: SettingsSection) => void;
}) {
  const [innerSection, setInnerSection] = useState<SettingsSection>("cuenta");
  const section = controlledSection ?? innerSection;
  const setSection = onSection ?? setInnerSection;
  const privileged = owner || admin;
  const restricted = section === "administradores" || section === "permisos" || section === "almacenamiento"
    || (guest && section === "tokens");
  // Mientras la carga de proyectos no ha confirmado el rol, una sección
  // restringida no es todavía un acceso denegado: se conserva la solicitud y
  // solo se redirige cuando el acceso ya está resuelto.
  const accessChecking = restricted && !projectsLoaded;
  const accessDenied = restricted && projectsLoaded && !privileged;
  const sections: WorkspaceItem<SettingsSection>[] = [
    { id: "cuenta", label: "Cuenta", icon: UserRound },
    { id: "sitio", label: "Tu Site", icon: Globe },
    { id: "apariencia", label: "Apariencia", icon: Palette },
    { id: "documentacion", label: "Documentación", icon: BookOpen },
    { id: "tokens", label: "Tokens MCP", icon: KeyRound },
    ...(privileged ? [
      { id: "administradores" as const, label: "Administradores", icon: ShieldCheck },
      { id: "permisos" as const, label: "Permisos", icon: Lock },
      { id: "almacenamiento" as const, label: "Almacenamiento", icon: HardDrive },
    ] : []),
  ];
  const visibleSections = guest ? sections.filter((item) => item.id !== "tokens") : sections;
  const active = accessDenied ? "cuenta" : section;

  useEffect(() => {
    if (!accessDenied) return;
    // Quita la sección restringida sin añadir una entrada al historial:
    // el setter normal de la URL usa pushState y rompería atrás/adelante.
    const url = new URL(window.location.href);
    url.searchParams.set("view", "ajustes");
    url.searchParams.delete("section");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setSection("cuenta");
  }, [accessDenied, setSection]);

  return (
    <WorkspaceLayout title="Ajustes" label="Secciones de ajustes" items={visibleSections} active={active} onSelect={setSection}>
      <div className="settings-content">
        {accessChecking ? (
          <div className="settings-access-loading" role="status">Comprobando permisos…</div>
        ) : active === "cuenta" ? (
          <SettingsAccount user={user} projectsLoaded={projectsLoaded} owner={owner} admin={admin} activeProject={activeProject} />
        ) : active === "sitio" ? (
          <SettingsSite onRemix={onRemix} />
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
