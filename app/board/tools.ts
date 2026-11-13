import type { ComponentType } from "react";
import { PencilRuler, Puzzle, Ruler } from "lucide-react";
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

export const spaceTools: SpaceTool[] = [
  {
    id: "excalidraw",
    name: "Excalidraw",
    description: "Pizarra del espacio de trabajo con Excalidraw (MIT): dibuja y colabora en directo.",
    icon: PencilRuler,
    roles: ["owner", "admin", "teacher", "student", "guest"],
  },
  {
    id: "edu-tools",
    name: "Herramientas de aula",
    description: "Calculadora con pantalla, modo científico, memoria e historial; ecuaciones por líneas con variables, tabla periódica, medición y lectura en voz alta (MIT).",
    icon: Ruler,
    roles: ["owner", "admin", "teacher", "student", "guest"],
  },
  {
    id: "blockly",
    name: "Programación por bloques",
    description: "Editor de bloques tipo Scratch con Blockly (Apache-2.0): lógica, bucles, matemáticas y texto, guardado por proyecto y código generado en JavaScript y Python.",
    icon: Puzzle,
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
