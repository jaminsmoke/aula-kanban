"use client";

import { LogOut } from "lucide-react";
import type { Project } from "../shared/model";

const roleNames = { owner: "Propietario", admin: "Administrador", teacher: "Profesor", student: "Alumno", guest: "Invitado" } as const;

/**
 * Sección Cuenta de los ajustes generales.
 * @param props - Cuenta, permisos y proyecto activo.
 * @returns La información de la cuenta y el cierre de sesión.
 */
export default function SettingsAccount({ user, projectsLoaded, owner, admin, activeProject }: {
  user: { displayName: string; email: string };
  projectsLoaded: boolean;
  owner: boolean;
  admin: boolean;
  activeProject?: Project;
}) {
  return (
    <section className="settings-section" aria-labelledby="settings-account-title">
      <h2 id="settings-account-title">Cuenta</h2>
      <p>Tu cuenta en esta instancia de Aula Kanban.</p>
      <dl>
        <div><dt>Cuenta de ChatGPT</dt><dd>{user.displayName}<br /><span>{user.email}</span></dd></div>
        <div><dt>Permiso en la aplicación</dt><dd>{!projectsLoaded ? "Consultando…" : owner ? "Propietario y administrador" : admin ? "Administrador" : "Sin permisos de administración"}</dd></div>
        <div><dt>Proyecto activo</dt><dd>{activeProject?.name ?? "Ninguno"}</dd></div>
        <div><dt>Rol en el proyecto</dt><dd>{!projectsLoaded ? "Consultando…" : activeProject ? roleNames[activeProject.role] : "Sin acceso a un proyecto activo"}</dd></div>
      </dl>
      <p className="settings-note">Los permisos de esta aplicación son independientes de la propiedad del Site en Sites.</p>
      <a className="secondary settings-signout" href="/signout-with-chatgpt?return_to=%2Fsesion" target="_top"><LogOut size={16} /> Cerrar sesión</a>
    </section>
  );
}
