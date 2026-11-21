import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { AULA_SEARCH_META } from "./search-meta";

/** Opciones de búsqueda interna del documento. */
export type AulaSearchOptions = {
  query: string;
  caseSensitive: boolean;
  diacriticsSensitive: boolean;
};

/** Coincidencia de búsqueda en posiciones del documento Tiptap. */
export type AulaSearchMatch = {
  index: number;
  from: number;
  to: number;
  text: string;
  before: string;
  after: string;
};

/** Máximo de coincidencias que se muestran para no bloquear documentos enormes. */
const AULA_SEARCH_MAX_MATCHES = 500;

/**
 * Convierte un texto y devuelve el mapa de cada carácter normalizado a su
 * posición original.
 * @param value - Texto original.
 * @param options - Mayúsculas y acentos.
 * @returns Texto normalizado y mapa de posiciones.
 */
function foldText(value: string, options: Pick<AulaSearchOptions, "caseSensitive" | "diacriticsSensitive">) {
  let folded = "";
  const map: number[] = [];
  let offset = 0;
  for (const character of value) {
    const withoutMarks = options.diacriticsSensitive
      ? character
      : character.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const next = options.caseSensitive ? withoutMarks : withoutMarks.toLocaleLowerCase();
    for (let index = 0; index < next.length; index += 1) map.push(offset);
    folded += next;
    offset += character.length;
  }
  return { folded, map };
}

/**
 * Busca el texto visible del documento activo.
 * @param editor - Editor de Aula Documentos.
 * @param options - Consulta y sensibilidad.
 * @returns Coincidencias ordenadas por posición.
 */
export function searchAulaDocument(editor: Editor | null, options: AulaSearchOptions): AulaSearchMatch[] {
  const query = options.query.trim();
  if (!editor || query.length < 2) return [];
  const foldedQuery = foldText(query, options).folded;
  if (!foldedQuery) return [];
  const matches: AulaSearchMatch[] = [];

  editor.state.doc.descendants((node, position) => {
    if (matches.length >= AULA_SEARCH_MAX_MATCHES || !node.isText || !node.text) return;
    const { folded, map } = foldText(node.text, options);
    let cursor = 0;
    while (matches.length < AULA_SEARCH_MAX_MATCHES) {
      const found = folded.indexOf(foldedQuery, cursor);
      if (found < 0) break;
      const start = map[found] ?? 0;
      const end = (map[found + foldedQuery.length - 1] ?? start) + 1;
      matches.push({
        index: matches.length,
        from: position + start,
        to: position + end,
        text: node.text.slice(start, end),
        before: node.text.slice(Math.max(0, start - 40), start),
        after: node.text.slice(end, end + 40),
      });
      cursor = found + Math.max(1, foldedQuery.length);
    }
  });
  return matches;
}

/**
 * Aplica el resaltado de coincidencias al editor.
 * @param editor - Editor activo.
 * @param matches - Coincidencias.
 * @param activeIndex - Índice resaltado como activo.
 */
export function setAulaSearchHighlights(editor: Editor | null, matches: AulaSearchMatch[], activeIndex: number) {
  if (!editor) return;
  editor.view.dispatch(editor.state.tr.setMeta(AULA_SEARCH_META, { matches, activeIndex }));
}

/**
 * Elimina los resaltados de búsqueda.
 * @param editor - Editor activo.
 */
export function clearAulaSearchHighlights(editor: Editor | null) {
  setAulaSearchHighlights(editor, [], 0);
}

/**
 * Selecciona y desplaza la vista a una coincidencia.
 * @param editor - Editor activo.
 * @param match - Coincidencia elegida.
 */
export function focusAulaSearchMatch(editor: Editor | null, match: AulaSearchMatch | undefined) {
  if (!editor || !match) return;
  const selection = TextSelection.create(editor.state.doc, match.from, match.to);
  editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView());
}

/**
 * Reemplaza coincidencias en una sola transacción, conservando las marcas del
 * texto original cuando la API de ProseMirror las expone.
 * @param editor - Editor activo.
 * @param matches - Coincidencias que se reemplazan.
 * @param replacement - Texto nuevo.
 * @returns `true` si se modificó el documento.
 */
export function replaceAulaSearchMatches(
  editor: Editor | null,
  matches: AulaSearchMatch[],
  replacement: string,
): boolean {
  if (!editor || matches.length === 0) return false;
  const transaction = editor.state.tr;
  for (const match of [...matches].sort((a, b) => b.from - a.from)) {
    const marks = editor.state.doc.resolve(match.from).marks();
    transaction.replaceWith(match.from, match.to, editor.schema.text(replacement, marks));
  }
  if (!transaction.docChanged) return false;
  editor.view.dispatch(transaction);
  return true;
}
