import type { ComponentType } from "react";
import { Blocks, PencilRuler } from "lucide-react";
import { NodumIcon } from "./nodum-icon";
import { N8nIcon } from "./n8n-icon";
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
  /**
   * Dónde vive la herramienta:
   * - "site": librería npm o código propio dentro de Aula (Excalidraw).
   *   No necesita VPS; se instala desde Aula Store y su estado se guarda
   *   en la tabla `space_apps` (ver `/api/space-apps`).
   * - "vps": servicio externo con backend propio (Nodum, AFFiNE, n8n).
   *   Requiere instancia desplegada en el VPS y su URL en una variable.
   */
  host: "site" | "vps";
  /**
   * Variables de entorno (en el panel de Sites) que pueden apuntar a la
   * instancia del VPS, en orden de preferencia. Vacío si no aplica.
   */
  envVars: string[];
  /** Roles que la ven; "admin" incluye a owner y admin (ven todas). */
  roles: SpaceRole[];
};

/**
 * Lee una variable de entorno pública del build (`VITE_*` o
 * `NEXT_PUBLIC_*`, incrustadas al publicar).
 * @param names - Nombres de variable aceptados, en orden de preferencia.
 * @returns El valor configurado o `undefined` si no está fijado.
 */
function envValue(names: string[]): string | undefined {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  for (const name of names) {
    const value = env[name];
    if (value) return value;
  }
  return undefined;
}

/**
 * URL de la instancia externa de una herramienta (su VPS), si está
 * configurada en las variables del Site.
 * @param tool - Herramienta del catálogo.
 * @returns La URL configurada, o `undefined` si la herramienta es del
 *   propio Site o aún no hay instancia del VPS apuntada.
 */
export function toolInstanceUrl(tool: SpaceTool): string | undefined {
  if (tool.host !== "vps") return undefined;
  return envValue(tool.envVars);
}

/**
 * Indica si una herramienta puede usarse ya: las del propio Site siempre;
 * las del VPS solo cuando su instancia está configurada.
 * @param tool - Herramienta del catálogo.
 * @returns `true` si la herramienta está lista para abrirse.
 */
export function isToolReady(tool: SpaceTool): boolean {
  return tool.host === "site" || toolInstanceUrl(tool) !== undefined;
}

/**
 * Herramientas del catálogo que aún necesitan la configuración del VPS
 * (servicio externo sin URL fijada en las variables del Site).
 * @param tools - Catálogo de herramientas.
 * @returns Las herramientas externas sin instancia configurada.
 */
export function toolsNeedingVps(tools: SpaceTool[] = spaceTools): SpaceTool[] {
  return tools.filter((tool) => tool.host === "vps" && !isToolReady(tool));
}


/**
 * Catálogo de herramientas del hub «Mi espacio»: cada una se abre como
 * ventana dentro del escritorio (ver `space-view.tsx`). La mayoría se
 * comparten entre profesor y alumno; lo específico se filtra por
 * `roles`, y quien es administrador (owner/admin) ve todas.
 * Hay dos clases de herramienta (`host`): las del propio Site —librerías
 * npm o código propio, instalables desde Aula Store (Excalidraw)— y los
 * servicios externos con backend propio, que viven en el VPS del propietario
 * (Nodum, AFFiNE, n8n) y solo están activas cuando su instancia está
 * configurada vía variables de entorno (ver README, «Mi espacio»).
 * Nodum (MIT) es la alternativa real a Obsidian: base de conocimiento
 * web con wikilinks, backlinks y grafo (ver `nodum-app.tsx`).
 * Excalidraw (MIT) es la pizarra del propio espacio de trabajo (ver
 * `excalidraw-app.tsx`), distinta de las pizarras de las tareas: se
 * instala desde Aula Store y su estado vive en la DB (`space_apps`).
 * AFFiNE (editor MIT, backend Enterprise Edition) sigue el mismo patrón
 * que Nodum (ver `affine-app.tsx`).
 * n8n (Sustainable Use License) automatiza flujos y conecta aplicaciones;
 * también sigue ese patrón VPS (ver `n8n-app.tsx`).
 */
export const spaceTools: SpaceTool[] = [
  {
    id: "nodum",
    name: "Nodum",
    description: "Base de conocimiento Markdown con wikilinks y grafo (Nodum, MIT).",
    icon: NodumIcon,
    host: "vps",
    envVars: ["VITE_NODUM_URL", "NEXT_PUBLIC_NODUM_URL"],
    roles: ["owner", "admin", "teacher", "student", "guest"],
  },
  {
    id: "excalidraw",
    name: "Excalidraw",
    description: "Pizarra del espacio de trabajo con Excalidraw (MIT): dibuja y colabora en directo.",
    icon: PencilRuler,
    host: "site",
    envVars: [],
    roles: ["owner", "admin", "teacher", "student", "guest"],
  },
  {
    id: "affine",
    name: "AFFiNE",
    description: "Workspace de documentos y pizarras (AFFiNE): abre tu instancia en una ventana.",
    icon: Blocks,
    host: "vps",
    envVars: ["VITE_AFFINE_URL", "NEXT_PUBLIC_AFFINE_URL"],
    roles: ["owner", "admin", "teacher", "student", "guest"],
  },
  {
    id: "n8n",
    name: "n8n",
    description: "Automatiza tareas y conecta aplicaciones con flujos visuales (n8n).",
    icon: N8nIcon,
    host: "vps",
    envVars: ["VITE_N8N_URL", "NEXT_PUBLIC_N8N_URL"],
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
