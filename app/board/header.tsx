"use client";

import type { MouseEvent } from "react";
import { Check, ChevronDown, Columns3, FolderKanban, Link2, LogOut, Plus, Settings, Trash2, Users } from "lucide-react";
import type { Project } from "./model";

type View = "kanban" | "alumnos" | "profesores";

export default function BoardHeader({
  user, activeProject, projects, projectId, view, onView, owner, admin, canManage,
  onNewProject, onShareProject, onMembers, onDeleteProject, onRemix, onSettings,
}: {
  user: { displayName: string; email: string };
  activeProject?: Project;
  projects: Project[];
  projectId: string;
  view: View;
  onView: (view: View) => void;
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

  return (
    <header className="topbar">
      <div className={`shell topbar-inner${activeProject ? "" : " no-project"}`}>
        <span className="wordmark"><span className="brand-icon"><Columns3 size={20} strokeWidth={2.6} /></span>Aula Kanban</span>
        {activeProject && <nav className="main-nav" aria-label="Vistas">
          <button type="button" aria-current={view === "kanban" ? "page" : undefined} onClick={() => onView("kanban")}>Kanban</button>
          <button type="button" aria-current={view === "alumnos" ? "page" : undefined} onClick={() => onView("alumnos")}>Alumnos</button>
          <button type="button" aria-current={view === "profesores" ? "page" : undefined} onClick={() => onView("profesores")}>Profesores</button>
        </nav>}
        {activeProject && <details className="project-menu">
          <summary aria-label="Seleccionar proyecto"><FolderKanban size={18} /><span>{activeProject.name}</span><ChevronDown size={16} /></summary>
          <div className="project-dropdown">
            <p>Proyectos</p>
            {projects.map((project) => <a key={project.id} href={project.id === "default" ? "/" : `/?project=${encodeURIComponent(project.id)}`} aria-current={project.id === projectId ? "page" : undefined}><span>{project.name}</span>{project.id === projectId && <Check size={16} />}</a>)}
            <div className="project-menu-actions">
              {(owner || admin) && <button type="button" onClick={(event) => { close(event); onNewProject(); }}><Plus size={16} /> Nuevo proyecto</button>}
              {activeProject && <button type="button" onClick={(event) => { close(event); onShareProject(); }}><Link2 size={16} /> Compartir proyecto</button>}
              {canManage && <button type="button" onClick={(event) => { close(event); onMembers(); }}><Users size={16} /> Gestionar miembros</button>}
              {(owner || admin) && activeProject && <button type="button" className="project-delete-action" onClick={(event) => { close(event); onDeleteProject(); }}><Trash2 size={16} /> Eliminar proyecto</button>}
              <button type="button" className="remix-action" onClick={(event) => { close(event); onRemix(); }}><Plus size={16} /> Haz tu Site de Aula Kanban</button>
            </div>
          </div>
        </details>}
        <details className="account-menu">
          <summary className="account-indicator" aria-label="Ver cuenta de ChatGPT">
            <span className="account-avatar" aria-hidden>{(user.displayName.trim()[0] || user.email[0]).toUpperCase()}</span>
            <span className="account-name">{user.displayName}</span>
          </summary>
          <div className="account-dropdown">
            <strong>Cuenta de ChatGPT</strong><span>{user.email}</span>
            <button type="button" onClick={(event) => { close(event); onSettings(); }}><Settings size={16} /> Ajustes de la cuenta</button>
            <a href="/signout-with-chatgpt?return_to=%2Fsesion" target="_top"><LogOut size={16} /> Cerrar sesión</a>
          </div>
        </details>
      </div>
    </header>
  );
}
