import { lazy, type ComponentType } from "react";
import { Atom, CalendarClock, Calculator, FileSearch, FileStack, FlaskConical, GitBranch, Layers3, Network, NotebookPen, Orbit, PencilRuler, Presentation, Puzzle, Ruler, Sheet, Swords } from "lucide-react";
import { NATIVE_APPS, nativeAppMeta, type NativeAppId } from "../../../lib/native-apps";
import type { StoreIconProps, StoreRole, StoreTool } from "./types";

/** Props comunes que recibe cada app nativa dentro de su ventana. */
export type StoreAppProps = { projectId: string; role: StoreRole; instanceUrl?: string };

const ROLES: StoreRole[] = ["owner", "admin", "teacher", "student", "guest"];

const ICONS: Record<NativeAppId, ComponentType<StoreIconProps>> = {
  excalidraw: PencilRuler,
  calculadora: Calculator,
  "tabla-periodica": Atom,
  blockly: Puzzle,
  mermaid: GitBranch,
  ajedrez: Swords,
  tarjetas: Layers3,
  fisica: Orbit,
  geometria: Ruler,
  mapas: Network,
  presentaciones: Presentation,
  moleculas: FlaskConical,
  timeline: CalendarClock,
  "hoja-calculo": Sheet,
  documentos: NotebookPen,
  "visor-office": FileSearch,
  "aula-documentos": FileStack,
};

// El código de cada app solo se descarga cuando su ventana se abre por
// primera vez. Añadir una app = crear su carpeta y registrarla aquí.
const APPS: Record<NativeAppId, ComponentType<StoreAppProps>> = {
  excalidraw: lazy(() => import("./excalidraw/excalidraw-app")),
  calculadora: lazy(() => import("./calculadora/calculadora-app")),
  "tabla-periodica": lazy(() => import("./tabla-periodica/tabla-periodica-app")),
  blockly: lazy(() => import("./blockly/blockly-app")),
  mermaid: lazy(() => import("./mermaid/mermaid-app")),
  ajedrez: lazy(() => import("./ajedrez/ajedrez-app")),
  tarjetas: lazy(() => import("./tarjetas/tarjetas-app")),
  fisica: lazy(() => import("./fisica/fisica-app")),
  geometria: lazy(() => import("./geometria/geometria-app")),
  mapas: lazy(() => import("./mapas/mapas-app")),
  presentaciones: lazy(() => import("./presentaciones/presentaciones-app")),
  moleculas: lazy(() => import("./moleculas/moleculas-app")),
  timeline: lazy(() => import("./timeline/timeline-app")),
  "hoja-calculo": lazy(() => import("./hoja-calculo/hoja-calculo-app")),
  documentos: lazy(() => import("./documentos/documentos-app")),
  "visor-office": lazy(() => import("./visor-office/visor-office-app")),
  "aula-documentos": lazy(() => import("./aula-documentos/aula-documentos-app")),
};

/** Componente de cada app, indexado por id, para abrir su ventana. */
export const toolApps: Record<string, ComponentType<StoreAppProps>> = APPS;

/** Catálogo de apps con su icono y roles, listo para la tienda y el hub. */
export const storeTools: StoreTool[] = NATIVE_APPS.map((meta) => ({
  ...meta,
  icon: ICONS[meta.id],
  roles: [...ROLES],
}));

/**
 * Tamaño inicial de la ventana de una app.
 * @param id - Identificador de la app.
 * @returns Su tamaño preferido o el de una ventana estándar.
 */
export function toolWindow(id: string): { width: number; height: number } {
  return nativeAppMeta(id)?.window ?? { width: 880, height: 560 };
}

const isAdmin = (role: StoreRole) => role === "owner" || role === "admin";

/**
 * Herramientas visibles para un rol: las suyas y, si es administrador,
 * todas las que existan.
 * @param role - Rol del usuario en el proyecto activo.
 * @param tools - Catálogo completo de herramientas.
 * @returns Las herramientas que ese rol puede ver.
 */
export function visibleTools(role: StoreRole, tools: StoreTool[] = storeTools): StoreTool[] {
  if (isAdmin(role)) return tools;
  return tools.filter((tool) => tool.roles.includes(role));
}
