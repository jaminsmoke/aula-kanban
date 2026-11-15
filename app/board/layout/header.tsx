"use client";

import type { MouseEvent } from "react";
import { Backpack, Check, ChevronDown, Columns3, FolderKanban, Link2, LogOut, Plus, Settings, Trash2, Users } from "lucide-react";
import appPackage from "../../../package.json";
import type { Project } from "../shared/model";
import { buildBoardUrl } from "../shared/board-url";
import type { ClassSection } from "../class/class-view";
import type { SettingsSection } from "../settings/settings-view";
import "./header.css";

const appVersion = appPackage.version;
const appAuthor = typeof appPackage.author === "string" ? appPackage.author : "";

// El tipo canónico vive en `lib/domain/board-url`; se reexporta aquí
// para conservar el import histórico de la cabecera.
export type { BoardView } from "../../../lib/domain/board-url";
import type { AdministracionSection, BoardView } from "../../../lib/domain/board-url";
type View = BoardView;

/**
 * Cabecera del tablero con marca, versión, navegación y menús.
 * @param props - Cuenta, proyectos, vista activa y acciones de la cabecera.
 * @returns La cabecera con selector de proyecto y menú de cuenta.
 */
export default function BoardHeader({
  user, activeProject, projects, projectId, view, onView, owner, admin, canManage,
  onNewProject, onShareProject, onMembers, onDeleteProject, onRemix, onSettings,
  classSection = "tareas", settingsSection = "cuenta", administracionSection = "alumnos",
  onMochila, mochilaLabel = "Mi mochila",
}: {
  user: { displayName: string; email: string };
  activeProject?: Project;
  projects: Project[];
  projectId: string;
  view: View;
  onView: (view: View) => void;
  onMochila?: () => void;
  mochilaLabel?: string;
  classSection?: ClassSection;
  settingsSection?: SettingsSection;
  administracionSection?: AdministracionSection;
  owner: boolean;
  admin: boolean;
  canManage: boolean;
  onNewProject: () => void;
  onShareProject: () => void;
  onMembers: () => void;
  onDeleteProject: () => void;
  onRemix: () => void;
  onSettings: () => void;
}) {
  function close(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  function projectHref(id: string) {
    const base = id === "default" ? "" : `?project=${encodeURIComponent(id)}`;
    const search = buildBoardUrl(base, { view, classSection, settingsSection, administracionSection });
    return search ? `/${search}` : "/";
  }

  return (
    <header className="topbar">
      <div className={`shell topbar-inner${activeProject ? "" : " no-project"}`}>
        <span className="wordmark"><span className="brand-icon" aria-hidden><Columns3 size={24} strokeWidth={2.4} /></span><span className="brand-text"><span>Aula Kanban</span><small className="brand-meta">v{appVersion} - {appAuthor}</small></span></span>
        {activeProject && <nav className="main-nav" aria-label="Vistas">
          <button type="button" aria-current={view === "administracion" ? "page" : undefined} onClick={() => onView("administracion")}>Administración</button>
          <button type="button" className="class-action" aria-label="Clase" title="Clase" aria-current={view === "clase" && classSection !== "mochila" ? "page" : undefined} onClick={() => onView("clase")}><Columns3 size={18} aria-hidden /></button>
          {onMochila && <button type="button" className="class-action" aria-label={mochilaLabel} title={mochilaLabel} aria-current={view === "clase" && classSection === "mochila" ? "page" : undefined} onClick={onMochila}><Backpack size={18} aria-hidden /></button>}
        </nav>}
        {activeProject && <details className="project-menu">
          <summary aria-label="Seleccionar proyecto"><FolderKanban size={18} /><span>{activeProject.name}</span><ChevronDown size={16} /></summary>
          <div className="project-dropdown">
            <p>Proyectos</p>
            {projects.map((project) => <a key={project.id} href={projectHref(project.id)} aria-current={project.id === projectId ? "page" : undefined}><span>{project.name}</span>{project.id === projectId && <Check size={16} />}</a>)}
            <div className="project-menu-actions">
              {(owner || admin) && <button type="button" onClick={(event) => { close(event); onNewProject(); }}><Plus size={16} /> Nuevo proyecto</button>}
              {activeProject && <button type="button" onClick={(event) => { close(event); onShareProject(); }}><Link2 size={16} /> Compartir proyecto</button>}
              {canManage && <button type="button" onClick={(event) => { close(event); onMembers(); }}><Users size={16} /> Gestionar miembros</button>}
              {(owner || admin) && activeProject && <button type="button" className="project-delete-action" onClick={(event) => { close(event); onDeleteProject(); }}><Trash2 size={16} /> Eliminar proyecto</button>}
              <button type="button" className="remix-action" onClick={(event) => { close(event); onRemix(); }}><Plus size={16} /> Haz tu Site de Aula Kanban</button>
            </div>
          </div>
        </details>}
        <button type="button" className="header-settings" aria-current={view === "ajustes" ? "page" : undefined} onClick={onSettings} aria-label="Ajustes" title="Ajustes">
          <Settings size={18} aria-hidden />
        </button>
        <details className="account-menu">
          <summary className="account-indicator" aria-label="Ver cuenta de ChatGPT">
            <span className="account-avatar" aria-hidden>{(user.displayName.trim()[0] || user.email[0]).toUpperCase()}</span>
            <span className="account-name">{user.displayName}</span>
          </summary>
          <div className="account-dropdown">
            <strong>Cuenta de ChatGPT</strong><span>{user.email}</span>
            <a className="account-signout" href="/signout-with-chatgpt?return_to=%2Fsesion" target="_top"><LogOut size={16} /> Cerrar sesión</a>
          </div>
        </details>
      </div>
    </header>
  );
}
