"use client";

import { Lock } from "lucide-react";
import { capacidadConcedida, capacidadesDe, type RolProyecto } from "../../../../lib/domain/permisos";

/** Etiqueta legible de cada rol de proyecto. */
const ROLE_LABELS: Record<RolProyecto, string> = {
  owner: "Dueño",
  admin: "Administración",
  teacher: "Profesorado",
  student: "Alumnado",
  guest: "Invitado",
};

/** Columnas de la matriz: los roles que el servidor distingue en un proyecto. */
const COLUMNS: readonly { rol: RolProyecto; label: string }[] = [
  { rol: "admin", label: "Administración" },
  { rol: "teacher", label: "Profesorado" },
  { rol: "student", label: "Alumnado" },
  { rol: "guest", label: "Invitado" },
];

/** Miembro del proyecto con el rol efectivo que le aplica el servidor. */
export type ProjectPermissionsMember = { nombre: string; rol: RolProyecto };

/**
 * Pestaña Permisos de Profesores y Alumnos: matriz de proyecto en solo
 * lectura y rol efectivo de las fichas visibles. Se pinta desde
 * `lib/domain/permisos.ts`, la misma fuente que evalúa el servidor, y no
 * ofrece controles porque no existen concesiones que persistir.
 * @param props - Miembros con su rol efectivo y el contexto de la lista.
 * @returns La matriz del proyecto y el rol de cada miembro.
 */
export default function ProjectPermissionsPanel({
  miembros,
  contexto,
}: {
  miembros: readonly ProjectPermissionsMember[];
  contexto: string;
}) {
  const capacidades = capacidadesDe("proyecto");
  return (
    <section className="project-permissions" aria-labelledby="project-permissions-title">
      <header className="project-permissions-head">
        <span className="project-permissions-icon" aria-hidden><Lock size={22} strokeWidth={2} /></span>
        <div>
          <h3 id="project-permissions-title">Permisos del proyecto</h3>
          <p>
            Qué puede hacer cada rol dentro de este proyecto. El servidor aplica esta misma matriz: aquí solo se
            consulta.
          </p>
        </div>
      </header>

      <div className="project-permissions-block">
        <h4>Rol efectivo</h4>
        <p className="project-permissions-scope">{contexto}</p>
        {miembros.length ? (
          <ul className="project-permissions-members">
            {miembros.map((miembro) => {
              const concedidas = capacidades.filter((capacidad) =>
                capacidadConcedida(capacidad.id, { globalRole: null, projectRole: miembro.rol }),
              );
              return (
                <li key={`${miembro.rol}-${miembro.nombre}`} className="project-permissions-member">
                  <strong>{miembro.nombre}</strong>
                  <span className="project-permissions-role">{ROLE_LABELS[miembro.rol]}</span>
                  <span className="project-permissions-count">
                    {concedidas.length} de {capacidades.length} capacidades
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="project-permissions-empty">No hay fichas que mostrar en esta sección.</p>
        )}
      </div>

      <div className="project-permissions-block">
        <h4>Capacidades por rol</h4>
        <div className="project-permissions-table-wrap">
          <table className="project-permissions-table">
            <caption>Capacidades del proyecto por rol</caption>
            <thead>
              <tr>
                <th scope="col">Capacidad</th>
                {COLUMNS.map((column) => <th key={column.rol} scope="col">{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {capacidades.map((capacidad) => (
                <tr key={capacidad.id}>
                  <th scope="row">
                    {capacidad.titulo}
                    <span className="project-permissions-desc">{capacidad.descripcion}</span>
                  </th>
                  {COLUMNS.map((column) => {
                    const concedida = capacidadConcedida(capacidad.id, { globalRole: null, projectRole: column.rol });
                    return (
                      <td key={column.rol} className={concedida ? "is-granted" : "is-denied"}>
                        {concedida ? "Sí" : "No"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="project-permissions-note">
        El dueño y la administración de la instancia entran con el rol más alto; una cuenta sin ficha en el proyecto
        entra como invitado.
      </p>
      <p className="project-permissions-note">
        El profesorado gestiona al alumnado, pero no puede administrar la instancia. Las capacidades de instancia se
        consultan en Ajustes &gt; Permisos.
      </p>
    </section>
  );
}
