import type { JSONContent } from "@tiptap/core";
import { contentInlineText } from "./text";

/** Diapositiva derivada de un documento de Aula Documentos. */
export type AulaPresentationSlide = {
  title: string;
  content: JSONContent[];
};

/**
 * Deduce el título de una diapositiva.
 * @param content - Contenido de la diapositiva.
 * @param index - Posición de la diapositiva.
 * @returns Título visible o un fallback numerado.
 */
function slideTitle(content: JSONContent[], index: number): string {
  const heading = content.find((node) => node.type === "heading");
  if (heading) {
    const text = contentInlineText(heading).trim();
    if (text) return text.slice(0, 120);
  }
  const paragraph = content.find((node) => node.type === "paragraph");
  if (paragraph) {
    const text = contentInlineText(paragraph).trim();
    if (text) return text.slice(0, 80);
  }
  return `Diapositiva ${index + 1}`;
}

/**
 * Construye las diapositivas de un documento.
 * Si hay saltos explícitos, se respetan; si no, empieza una diapositiva en cada H1/H2.
 * @param content - Contenido raíz del documento.
 * @returns Diapositivas con su contenido.
 */
export function buildPresentationSlides(content: JSONContent): AulaPresentationSlide[] {
  const nodes = content.content ?? [];
  const hasExplicitBreaks = nodes.some((node) => node.type === "slideBreak");
  const groups: JSONContent[][] = [];

  if (hasExplicitBreaks) {
    let current: JSONContent[] = [];
    for (const node of nodes) {
      if (node.type === "slideBreak") {
        if (current.length) groups.push(current);
        current = [];
      } else {
        current.push(node);
      }
    }
    if (current.length) groups.push(current);
  } else {
    let current: JSONContent[] = [];
    for (const node of nodes) {
      const startsSlide = node.type === "heading" && (node.attrs?.level === 1 || node.attrs?.level === 2);
      if (startsSlide && current.length) {
        groups.push(current);
        current = [node];
      } else {
        current.push(node);
      }
    }
    if (current.length) groups.push(current);
  }

  const slides = (groups.length ? groups : [[]]).map((group, index) => ({
    title: slideTitle(group, index),
    content: group,
  }));
  return slides.length ? slides : [{ title: "Diapositiva 1", content: [] }];
}

/**
 * Indica si el documento usa saltos de diapositiva explícitos.
 * @param content - Contenido raíz del documento.
 * @returns `true` si hay al menos un `slideBreak`.
 */
export function hasExplicitSlideBreaks(content: JSONContent): boolean {
  return (content.content ?? []).some((node) => node.type === "slideBreak");
}
