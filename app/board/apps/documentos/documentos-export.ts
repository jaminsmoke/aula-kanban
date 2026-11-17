import { generateHTML } from "@tiptap/core";
import { createDocumentExtensions } from "./documentos-editor";
import type { NotesDocument } from "./documentos-model";

/**
 * Escapa texto para incluirlo en HTML.
 * @param value - Texto sin escapar.
 * @returns Texto seguro para HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Genera un HTML autónomo a partir de un documento ya validado.
 * @param document - Documento validado.
 * @returns Un archivo HTML sin recursos externos.
 */
export function buildNotesHtml(document: NotesDocument): string {
  const title = document.title.trim() || "Nota sin título";
  const safeTitle = escapeHtml(title);
  const content = generateHTML(document.content, createDocumentExtensions());

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Aula Kanban · Notas y documentos">
<title>${safeTitle}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; background: #f7f8fc; color: #211b36; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.7; }
  main { width: min(100% - 40px, 760px); margin: 40px auto; padding: 48px 56px; border: 1px solid #e7e4ef; border-radius: 18px; background: #fff; box-shadow: 0 16px 48px #3022550d; }
  h1.title { margin: 0 0 8px; font-size: 2rem; line-height: 1.2; }
  .subtitle { margin: 0 0 28px; color: #6b647e; font-size: .9rem; }
  article > :first-child { margin-top: 0; }
  article > :last-child { margin-bottom: 0; }
  h1, h2, h3 { line-height: 1.25; }
  h1 { font-size: 1.8rem; }
  h2 { margin-top: 1.8em; font-size: 1.35rem; }
  h3 { margin-top: 1.5em; font-size: 1.1rem; }
  p { margin: 0.8em 0; }
  ul, ol { padding-left: 1.5em; }
  li + li { margin-top: .3em; }
  blockquote { margin: 1.2em 0; padding: .4em 0 .4em 1em; border-left: 3px solid #5839be; color: #4a4458; font-style: italic; }
  code { padding: .15em .35em; border-radius: 4px; background: #f1eff8; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .92em; }
  pre { overflow: auto; padding: 1em 1.2em; border-radius: 10px; background: #f1eff8; }
  pre code { padding: 0; background: transparent; }
  a { color: #5839be; font-weight: 600; }
  hr { border: 0; border-top: 1px solid #e7e4ef; }
  @media print { body { background: #fff; } main { width: auto; max-width: none; margin: 0; padding: 0; border: 0; box-shadow: none; } }
</style>
</head>
<body>
<main>
<h1 class="title">${safeTitle}</h1>
<p class="subtitle">Exportado desde Notas y documentos · Aula Kanban</p>
<article>${content}</article>
</main>
</body>
</html>
`;
}
