import type { DocSection, DocSectionId } from "./types";
import { introSections } from "./intro";
import { peopleSections } from "./people";
import { taskSections } from "./tasks";
import { workspaceSections } from "./workspace";
import { helpSections } from "./help";

export { docSectionIds } from "./types";
export type { DocSectionId, DocNoteTone, DocBlock, DocSection } from "./types";

export const docsHero = {
  eyebrow: "Documentación",
  title: "Documentación de",
  titleAccent: "Aula Kanban",
  intro: "Cómo funciona el tablero, las tareas y su calendario, qué puede hacer cada rol, cómo se organiza el grupo y qué herramientas lo conectan con la IA.",
  back: "Volver a Clase",
  indexLabel: "Secciones de la documentación",
  indexTitle: "En esta página",
} as const;

/** Secciones en el orden en que se muestran. */
export const docSections: DocSection[] = [
  ...introSections,
  ...peopleSections,
  ...taskSections,
  ...workspaceSections,
  ...helpSections,
];

/**
 * Ancla HTML de una sección.
 * @param id - Identificador de la sección.
 * @returns El id del elemento, p. ej. `docs-roles`.
 */
export function docAnchor(id: DocSectionId): string {
  return `docs-${id}`;
}
