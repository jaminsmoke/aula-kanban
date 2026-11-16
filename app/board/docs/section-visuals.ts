import type { ComponentType } from "react";
import { AppWindow, Backpack, CalendarDays, Columns3, FolderKanban, KeyRound, LifeBuoy, Link2, ListTodo, PenTool, Plug, Sparkles, TriangleAlert, Users, UsersRound, type LucideIcon } from "lucide-react";
import type { DocSectionId } from "./content";
import { BoardArt, CalendarArt, HelpArt, LinksArt, McpArt, MochilaArt, NewsArt, OAuthArt, PeopleArt, ProjectsArt, RolesArt, SpaceArt, TasksArt, TroubleArt, WhiteboardArt } from "./illustrations";

/** Presentación de una sección: icono del índice/cabecera e ilustración. */
export type SectionVisual = { icon: LucideIcon; Illustration: ComponentType };

/**
 * Icono e ilustración por sección. `satisfies` obliga a cubrir cada id del
 * contenido: añadir una sección sin su visual es un error de tipos.
 */
export const sectionVisuals = {
  "que-es": { icon: Columns3, Illustration: BoardArt },
  roles: { icon: Users, Illustration: RolesArt },
  personas: { icon: UsersRound, Illustration: PeopleArt },
  proyectos: { icon: FolderKanban, Illustration: ProjectsArt },
  tareas: { icon: ListTodo, Illustration: TasksArt },
  calendario: { icon: CalendarDays, Illustration: CalendarArt },
  pizarras: { icon: PenTool, Illustration: WhiteboardArt },
  espacio: { icon: AppWindow, Illustration: SpaceArt },
  mochila: { icon: Backpack, Illustration: MochilaArt },
  mcp: { icon: Plug, Illustration: McpArt },
  oauth: { icon: KeyRound, Illustration: OAuthArt },
  enlaces: { icon: Link2, Illustration: LinksArt },
  novedades: { icon: Sparkles, Illustration: NewsArt },
  problemas: { icon: TriangleAlert, Illustration: TroubleArt },
  ayuda: { icon: LifeBuoy, Illustration: HelpArt },
} satisfies Record<DocSectionId, SectionVisual>;
