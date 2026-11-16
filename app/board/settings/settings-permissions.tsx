"use client";

import { Lock } from "lucide-react";
import { capacidadesDe, type RolGlobal } from "../../../lib/domain/permisos";

/** Nombres legibles de los roles globales de la matriz. */
const ROLE_LABELS: Record<RolGlobal, string> = {
  owner: "Dueño de la instancia",
  admin: "Administración",
};

/**
 * Sección Permisos de Ajustes: matriz de capacidades de instancia en solo
 * lectura. Se pinta desde `lib/domain/permisos.ts`, la misma fuente que
 * evalúa el servidor, así que nunca contradice lo que la aplicación aplica.
 * @returns La matriz de instancia con quién posee cada capacidad.
 */
export default function SettingsPermissions() {
  const capacidades = capacidadesDe("instancia");
  return (
    <section className="settings-section permissions-panel" aria-labelledby="settings-permissions-title">
      <div>
        <h2 id="settings-permissions-title">Permisos</h2>
        <p>
          Qué permite cada rol en la instancia. El servidor aplica esta misma matriz en la interfaz, la API, el MCP y
          los canales en vivo: los botones solo reflejan lo permitido, no lo conceden.
        </p>
      </div>
      <ul className="permissions-list" aria-label="Capacidades de instancia">
        {capacidades.map((capacidad) => (
          <li key={capacidad.id} className="permissions-row">
            <span className="permissions-icon" aria-hidden><Lock size={18} /></span>
            <div>
              <h3>{capacidad.titulo}</h3>
              <p>{capacidad.descripcion}</p>
            </div>
            <p className="permissions-roles">
              {capacidad.publica ? "Cualquier cuenta" : capacidad.global.map((rol) => ROLE_LABELS[rol]).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
      <p className="settings-note">
        Las capacidades globales no se delegan: instalar apps y gestionar fichas de administración quedan en manos del
        dueño y de la administración. El rol de profesor, por sí solo, nunca las concede.
      </p>
      <p className="settings-note">
        Los permisos de cada proyecto se consultan en Administración &gt; Profesores y Administración &gt; Alumnos, junto
        a sus miembros y herramientas.
      </p>
      <p className="settings-note">
        La titularidad del Site se gestiona fuera de la aplicación y no forma parte de esta matriz.
      </p>
    </section>
  );
}
