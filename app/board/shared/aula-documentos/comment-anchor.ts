import type { Editor } from "@tiptap/core";
import type { AulaCommentAnchor } from "../../../../lib/domain/aula-documentos/revision";

/** Longitud del contexto que acompaña una cita. */
const CONTEXT_LENGTH = 80;

/**
 * Construye un ancla a partir de la selección o del bloque actual.
 * @param editor - Editor activo.
 * @returns Ancla válida o `null` si no hay contenido.
 */
export function createAulaCommentAnchor(editor: Editor | null): AulaCommentAnchor | null {
  if (!editor) return null;
  const document = editor.state.doc;
  const selection = editor.state.selection;
  let from = selection.from;
  let to = selection.to;

  if (from === to) {
    const resolved = document.resolve(from);
    if (resolved.depth >= 1) {
      from = resolved.before(1);
      to = resolved.after(1);
    } else {
      from = 0;
      to = document.content.size;
    }
  }

  const quote = document.textBetween(from, to, " ").trim().slice(0, 500);
  const prefix = document.textBetween(Math.max(0, from - CONTEXT_LENGTH), from, " ").trimEnd().slice(-CONTEXT_LENGTH);
  const suffix = document.textBetween(to, Math.min(document.content.size, to + CONTEXT_LENGTH), " ").trimStart().slice(0, CONTEXT_LENGTH);
  let blockIndex = 0;
  document.forEach((_node, offset) => {
    if (offset <= from) blockIndex += 1;
  });

  if (!quote && from === to) return null;
  return { from, to, quote, prefix, suffix, blockIndex: Math.max(0, blockIndex - 1) };
}

/** Resultado de resolver un ancla en el documento actual. */
export type ResolvedAulaCommentAnchor = {
  from: number | null;
  to: number | null;
  orphan: boolean;
};

/**
 * Resuelve una cita o la marca como huérfana.
 * @param editor - Editor activo.
 * @param anchor - Ancla guardada.
 * @returns Posiciones actuales o un estado huérfano.
 */
export function resolveAulaCommentAnchor(editor: Editor | null, anchor: AulaCommentAnchor): ResolvedAulaCommentAnchor {
  if (!editor) return { from: null, to: null, orphan: true };
  const document = editor.state.doc;
  if (anchor.from >= 0 && anchor.to <= document.content.size) {
    const current = document.textBetween(anchor.from, anchor.to, " ").trim();
    if (current === anchor.quote) {
      return { from: anchor.from, to: anchor.to, orphan: false };
    }
  }

  if (anchor.quote) {
    const candidates: Array<{ from: number; to: number; score: number }> = [];
    document.descendants((node, position) => {
      if (!node.isText || !node.text) return;
      let cursor = 0;
      while (cursor <= node.text.length) {
        const found = node.text.indexOf(anchor.quote, cursor);
        if (found < 0) break;
        const before = node.text.slice(0, found).trimEnd();
        const after = node.text.slice(found + anchor.quote.length).trimStart();
        const score = (anchor.prefix && before.endsWith(anchor.prefix.trimEnd()) ? 1 : 0)
          + (anchor.suffix && after.startsWith(anchor.suffix.trimStart()) ? 1 : 0);
        candidates.push({
          from: position + found,
          to: position + found + anchor.quote.length,
          score,
        });
        cursor = found + Math.max(1, anchor.quote.length);
      }
    });
    if (candidates.length === 1) {
      return { from: candidates[0].from, to: candidates[0].to, orphan: false };
    }
    if (candidates.length > 1) {
      const best = Math.max(...candidates.map((candidate) => candidate.score));
      const winners = candidates.filter((candidate) => candidate.score === best);
      if (best > 0 && winners.length === 1) {
        return { from: winners[0].from, to: winners[0].to, orphan: false };
      }
    }
  }

  if (!anchor.quote) {
    let index = 0;
    let found: { from: number; to: number } | null = null;
    document.forEach((node, offset) => {
      if (index === anchor.blockIndex) {
        found = { from: offset, to: offset + node.nodeSize };
        return false;
      }
      index += 1;
    });
    if (found !== null) {
      const range = found as { from: number; to: number };
      return { from: range.from, to: range.to, orphan: false };
    }
  }

  return { from: null, to: null, orphan: true };
}
