import type { ComponentType } from "react";
import { PencilRuler } from "lucide-react";
import { NodumIcon } from "./nodum-icon";
import type { Project } from "./model";

export type SpaceRole = Project["role"];

/** Props de icono que acepta cualquier herramienta (lucide o logo real). */
export type SpaceIconProps = {
  /** Tamaño en píxeles del icono. */
  size?: number;
  /** Grosor de trazo (los lucide lo usan; los logos lo ignoran). */
  strokeWidth?: number;
  /** Clases CSS opcionales. */
  className?: string;
};

export type SpaceTool = {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<SpaceIconProps>;
  /** Roles que la ven; "admin" incluye a owner y admin (ven todas). */
  roles: SpaceRole[];
};


/**
 * Herramientas del hub «Mi espacio». La mayoría se comparten entre
 * profesor y alumno; lo específico se filtra por `roles`, y quien es
 * administrador (owner/admin) ve todas las herramientas. Cada una se
 * abre como ventana dentro del escritorio (ver `space-view.tsx`).
 * Nodum (MIT) es la alternativa real a Obsidian: base de conocimiento
 * web con wikilinks, backlinks y grafo, desplegada como site propio
 * de nodum; esta ventana la incrusta (ver `nodum-app.tsx`).
 * Excalidraw (MIT) es la misma pizarra de las tareas, pero compartida
 * por todo el proyecto (ver `excalidraw-app.tsx`).
 */
export const spaceTools: SpaceTool[] = [
  {
    id: "nodum",
    name: "Nodum",
    description: "Base de conocimiento Markdown con wikilinks y grafo (Nodum, MIT).",
    icon: NodumIcon,
    roles: ["owner", "admin", "teacher", "student", "guest"],
  },
  {
    id: "excalidraw",
    name: "Excalidraw",
    description: "Pizarra compartida del proyecto con Excalidraw (MIT): dibuja y colabora en directo.",
    icon: PencilRuler,
    roles: ["owner", "admin", "teacher", "student", "guest"],
  },
];

const isAdmin = (role: SpaceRole) => role === "owner" || role === "admin";

/**
 * Herramientas visibles para un rol: las suyas y, si es administrador,
 * todas las que existan.
 * @param role - Rol del usuario en el proyecto activo.
 * @param tools - Catálogo completo de herramientas.
 * @returns Las herramientas que ese rol puede ver.
 */
export function visibleTools(role: SpaceRole, tools: SpaceTool[] = spaceTools): SpaceTool[] {
  if (isAdmin(role)) return tools;
  return tools.filter((tool) => tool.roles.includes(role));
}
