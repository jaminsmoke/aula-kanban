import type { ComponentType } from "react";
import { AppWindow, Columns3, LifeBuoy, ListTodo, PenTool, Plug, Users, type LucideIcon } from "lucide-react";
import type { DocSectionId } from "./content";
import { BoardArt, HelpArt, McpArt, RolesArt, SpaceArt, TasksArt, WhiteboardArt } from "./illustrations";

/** Presentación de una sección: icono del índice/cabecera e ilustración. */
export type SectionVisual = { icon: LucideIcon; Illustration: ComponentType };

/**
 * Icono e ilustración por sección. `satisfies` obliga a cubrir cada id del
 * contenido: añadir una sección sin su visual es un error de tipos.
 */
export const sectionVisuals = {
  "que-es": { icon: Columns3, Illustration: BoardArt },
  roles: { icon: Users, Illustration: RolesArt },
  tareas: { icon: ListTodo, Illustration: TasksArt },
  pizarras: { icon: PenTool, Illustration: WhiteboardArt },
  espacio: { icon: AppWindow, Illustration: SpaceArt },
  mcp: { icon: Plug, Illustration: McpArt },
  ayuda: { icon: LifeBuoy, Illustration: HelpArt },
} satisfies Record<DocSectionId, SectionVisual>;
