"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
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
  const [preparing, setPreparing] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");

  async function prepareDemo() {
    setPreparing(true);
    setDemoMessage("");
    try {
      const response = await fetch("/api/admin/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json() as { message?: string };
      setDemoMessage(result.message ?? (response.ok ? "La demo está preparada." : "No se pudo preparar la demo."));
    } catch {
      setDemoMessage("No se pudo conectar para preparar la demo.");
    } finally {
      setPreparing(false);
    }
  }

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
      {owner && <div>
        <h3>Demostración pública</h3>
        <p>Prepara un proyecto ficticio de solo lectura. Si ya existe, se restablecerán sus datos de ejemplo.</p>
        <button className="secondary" type="button" onClick={prepareDemo} disabled={preparing}>{preparing ? "Preparando…" : "Preparar demo"}</button>
        {demoMessage && <p role="status">{demoMessage}</p>}
      </div>}
      <a className="secondary settings-signout" href="/signout-with-chatgpt?return_to=%2Fsesion" target="_top"><LogOut size={16} /> Cerrar sesión</a>
    </section>
  );
}
