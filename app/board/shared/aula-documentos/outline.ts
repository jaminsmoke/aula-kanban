import type { Editor } from "@tiptap/core";
import { buildPresentationSlides } from "../../../../lib/domain/aula-documentos/presentation";

/** Entrada del esquema de títulos. */
export type AulaOutlineEntry = {
  level: 1 | 2 | 3;
  text: string;
  from: number;
  to: number;
  children: AulaOutlineEntry[];
};

/** Entrada plana del esquema, con profundidad calculada. */
export type AulaOutlineRow = AulaOutlineEntry & { depth: number };

/** Entrada del navegador de diapositivas. */
export type AulaSlideEntry = {
  index: number;
  title: string;
  from: number;
  to: number;
};

/**
 * Construye el árbol de títulos H1–H3 del documento.
 * @param editor - Editor activo.
 * @returns Títulos anidados.
 */
export function buildAulaOutline(editor: Editor | null): AulaOutlineEntry[] {
  if (!editor) return [];
  const flat: AulaOutlineEntry[] = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== "heading") return;
    const level = Number(node.attrs.level);
    if (level !== 1 && level !== 2 && level !== 3) return;
    const text = node.textContent.trim();
    if (!text) return;
    flat.push({
      level: level as 1 | 2 | 3,
      text,
      from: position,
      to: position + node.nodeSize,
      children: [],
    });
  });

  const roots: AulaOutlineEntry[] = [];
  const stack: AulaOutlineEntry[] = [];
  for (const entry of flat) {
    while (stack.length && stack[stack.length - 1].level >= entry.level) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(entry);
    else roots.push(entry);
    stack.push(entry);
  }
  return roots;
}

/**
 * Aplana el esquema para pintarlo en una lista con profundidad.
 * @param entries - Árbol del esquema.
 * @param depth - Profundidad inicial.
 * @returns Filas en orden de lectura.
 */
export function flattenAulaOutline(entries: AulaOutlineEntry[], depth = 0): AulaOutlineRow[] {
  return entries.flatMap((entry) => [
    { ...entry, depth },
    ...flattenAulaOutline(entry.children, depth + 1),
  ]);
}

/**
 * Encuentra la fila activa para una posición de selección.
 * @param rows - Esquema aplanado.
 * @param position - Posición de selección.
 * @returns Índice de la fila o `-1`.
 */
export function activeAulaOutlineIndex(rows: AulaOutlineRow[], position: number): number {
  let active = -1;
  for (const [index, row] of rows.entries()) {
    if (row.from <= position) active = index;
    else break;
  }
  return active;
}

/**
 * Construye el índice de diapositivas con posiciones del documento.
 * @param editor - Editor activo.
 * @returns Diapositivas con número, título y rango.
 */
export function buildAulaSlideIndex(editor: Editor | null): AulaSlideEntry[] {
  if (!editor) return [];
  const slides = buildPresentationSlides(editor.getJSON());
  const nodes: Array<{ type: string; level?: number; from: number; to: number }> = [];
  editor.state.doc.forEach((node, offset) => {
    nodes.push({ type: node.type.name, level: Number(node.attrs.level), from: offset, to: offset + node.nodeSize });
  });

  const hasExplicitBreaks = nodes.some((node) => node.type === "slideBreak");
  const groups: Array<typeof nodes> = [];
  let current: typeof nodes = [];
  for (const node of nodes) {
    if (hasExplicitBreaks) {
      if (node.type === "slideBreak") {
        if (current.length) groups.push(current);
        current = [];
      } else current.push(node);
      continue;
    }
    const startsSlide = node.type === "heading" && (node.level === 1 || node.level === 2);
    if (startsSlide && current.length) {
      groups.push(current);
      current = [node];
    } else current.push(node);
  }
  if (current.length) groups.push(current);

  if (groups.length === 0) {
    return [{ index: 0, title: slides[0]?.title ?? "Diapositiva 1", from: 0, to: 0 }];
  }
  return groups.map((group, index) => ({
    index,
    title: slides[index]?.title ?? `Diapositiva ${index + 1}`,
    from: group[0].from,
    to: group[group.length - 1].to,
  }));
}
