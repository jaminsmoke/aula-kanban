import { generateHTML } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import type { AulaDocument, AulaPresentationTheme } from "../../../../lib/domain/aula-documentos/document";
import { createAulaDocumentExtensions } from "./document-extensions";

/**
 * Recorre el documento y devuelve los códigos Mermaid únicos.
 * @param content - Contenido Tiptap.
 * @returns Códigos en orden de aparición.
 */
export function collectMermaidCodes(content: JSONContent): string[] {
  const codes: string[] = [];
  const seen = new Set<string>();

  const visit = (node: JSONContent) => {
    if (node.type === "mermaidBlock") {
      const code = typeof node.attrs?.code === "string" ? node.attrs.code : "";
      if (!seen.has(code)) {
        seen.add(code);
        codes.push(code);
      }
    }
    for (const child of node.content ?? []) visit(child);
  };

  visit(content);
  return codes;
}

/**
 * Cuenta los bloques Mermaid del documento.
 * @param content - Contenido Tiptap.
 * @returns Número de bloques.
 */
export function countMermaidBlocks(content: JSONContent): number {
  let count = 0;
  const visit = (node: JSONContent) => {
    if (node.type === "mermaidBlock") count += 1;
    for (const child of node.content ?? []) visit(child);
  };
  visit(content);
  return count;
}

/**
 * Renderiza los códigos Mermaid que se puedan y deja los demás para el fallback.
 * @param codes - Códigos del documento.
 * @param render - Renderizador de Mermaid.
 * @returns SVG indexados por código.
 */
export async function renderMermaidSvgs(
  codes: Iterable<string>,
  render: (code: string) => Promise<string | null>,
): Promise<Map<string, string>> {
  const svgByCode = new Map<string, string>();
  for (const code of codes) {
    if (!code.trim()) continue;
    try {
      const svg = await render(code);
      if (svg) svgByCode.set(code, svg);
    } catch {
      /* El HTML conserva el código visible como respaldo. */
    }
  }
  return svgByCode;
}

/**
 * Escapa texto para insertarlo en HTML.
 * @param value - Texto sin escapar.
 * @returns Texto seguro.
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
 * Sustituye los marcadores de los diagramas por SVG ya renderizados.
 * @param html - HTML generado por Tiptap.
 * @param svgByCode - SVG indexados por código Mermaid.
 * @returns HTML con los diagramas insertados.
 */
function replaceMermaidPlaceholders(html: string, svgByCode: ReadonlyMap<string, string>): string {
  const template = document.createElement("template");
  template.innerHTML = html;

  for (const block of template.content.querySelectorAll<HTMLElement>("[data-mermaid-block]")) {
    const code = block.getAttribute("data-mermaid-code") ?? "";
    const svg = svgByCode.get(code);
    block.removeAttribute("data-mermaid-code");
    block.classList.add("aula-mermaid-export");
    if (svg) {
      block.innerHTML = svg;
      continue;
    }
    const message = document.createElement("p");
    message.className = "aula-mermaid-export-error";
    message.textContent = code.trim()
      ? "No se pudo dibujar el diagrama. Revisa el código Mermaid."
      : "El diagrama está vacío.";
    if (!code.trim()) {
      block.replaceChildren(message);
      continue;
    }
    const pre = document.createElement("pre");
    const codeElement = document.createElement("code");
    codeElement.textContent = code;
    pre.appendChild(codeElement);
    block.replaceChildren(message, pre);
  }

  return template.innerHTML;
}

/**
 * Genera el HTML de un contenido Tiptap e inserta los SVG disponibles.
 * @param content - Contenido raíz o nodo del documento.
 * @param svgByCode - SVG indexados por código Mermaid.
 * @returns HTML con los diagramas insertados.
 */
export function renderAulaContentHtml(
  content: JSONContent,
  svgByCode: ReadonlyMap<string, string> = new Map(),
): string {
  const html = generateHTML(content, createAulaDocumentExtensions());
  return replaceMermaidPlaceholders(html, svgByCode);
}

/**
 * Genera un HTML estático de diapositivas con tema y notas opcionales.
 * @param aulaDocument - Documento validado.
 * @param slides - HTML de cada diapositiva.
 * @param options - Tema, notas e inclusión de notas.
 * @returns Un archivo HTML sin scripts ni recursos externos.
 */
export function buildAulaPresentationHtml(
  aulaDocument: AulaDocument,
  slides: string[],
  options: {
    theme?: AulaPresentationTheme;
    notes?: Record<string, string>;
    includeNotes?: boolean;
  } = {},
): string {
  const title = escapeHtml(aulaDocument.title.trim() || "Presentación");
  const theme = options.theme ?? "aula";
  const includeNotes = options.includeNotes ?? true;
  const palette = theme === "claro"
    ? { bg: "#f4f3f8", slide: "#ffffff", ink: "#211b36", heading: "#2c214f", border: "#ded9e9", code: "#f1eff8", muted: "#625c74" }
    : theme === "oscuro"
      ? { bg: "#0f0e17", slide: "#191627", ink: "#f6f2ff", heading: "#ffffff", border: "#393152", code: "#29233d", muted: "#b4abc5" }
      : { bg: "#f7f8fc", slide: "#ffffff", ink: "#211b36", heading: "#2c214f", border: "#e7e4ef", code: "#f1eff8", muted: "#625c74" };

  const body = slides.map((slide, index) => {
    const note = includeNotes ? options.notes?.[String(index)]?.trim() : "";
    const notes = note
      ? `<details class="notes"><summary>Notas del orador</summary><p>${escapeHtml(note)}</p></details>`
      : "";
    return `<section class="slide">${slide}${notes}</section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Aula Kanban — Aula Documentos">
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: ${palette.bg}; color: ${palette.ink}; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.65; }
  .deck { width: min(100%, 1080px); margin: 0 auto; }
  .slide { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 8%; border-bottom: 1px solid ${palette.border}; background: ${palette.slide}; page-break-after: always; break-after: page; }
  .slide:last-child { border-bottom: 0; page-break-after: auto; break-after: auto; }
  h1, h2, h3 { color: ${palette.heading}; line-height: 1.2; }
  h1 { font-size: 2.4rem; } h2 { font-size: 1.9rem; } h3 { font-size: 1.4rem; }
  p, li { font-size: 1.05rem; }
  ul, ol { padding-left: 1.4em; }
  blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid ${palette.muted}; color: ${palette.muted}; }
  code { padding: .15em .35em; border-radius: 4px; background: ${palette.code}; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
  pre { overflow: auto; padding: 1em; border-radius: 8px; background: ${palette.code}; }
  pre code { padding: 0; background: transparent; }
  .aula-mermaid-export { margin: 1em 0; padding: 1em; overflow: auto; border: 1px solid ${palette.border}; border-radius: 10px; text-align: center; }
  .aula-mermaid-export svg { display: inline-block; max-width: 100%; height: auto; }
  .aula-mermaid-export-error { margin: 0 0 .7em; color: #8a2f2f; text-align: left; }
  .notes { margin-top: 2em; padding-top: 1em; border-top: 1px solid ${palette.border}; color: ${palette.muted}; font-size: .9rem; }
  .notes summary { cursor: pointer; font-weight: 700; }
  .notes p { white-space: pre-wrap; }
  @media print { body { background: #fff; } .slide { min-height: auto; } }
</style>
</head>
<body>
<main class="deck">
${body}
</main>
</body>
</html>
`;
}

/**
 * Genera un HTML autónomo con texto y diagramas ya renderizados.
 * @param aulaDocument - Documento validado.
 * @param svgByCode - SVG de cada código Mermaid.
 * @returns Un archivo HTML sin recursos externos.
 */
export function buildAulaDocumentHtml(
  aulaDocument: AulaDocument,
  svgByCode: ReadonlyMap<string, string> = new Map(),
): string {
  const title = aulaDocument.title.trim() || "Documento sin título";
  const safeTitle = escapeHtml(title);
  const withDiagrams = renderAulaContentHtml(aulaDocument.content, svgByCode);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Aula Kanban — Aula Documentos">
<title>${safeTitle}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; background: #f7f8fc; color: #211b36; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.7; }
  main { width: min(100% - 40px, 860px); margin: 40px auto; padding: 48px 56px; border: 1px solid #e7e4ef; border-radius: 18px; background: #fff; box-shadow: 0 16px 48px #3022550d; }
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
  .aula-mermaid-export { margin: 1.4em 0; padding: 1em; overflow: auto; border: 1px solid #e7e4ef; border-radius: 12px; background: #fbfaff; text-align: center; }
  .aula-mermaid-export svg { display: inline-block; max-width: 100%; height: auto; }
  .aula-mermaid-export-error { margin: 0 0 .7em; color: #8a2f2f; font-size: .85rem; font-weight: 700; text-align: left; }
  .aula-mermaid-export-error + pre { margin: 0; text-align: left; }
  @media print { body { background: #fff; } main { width: auto; max-width: none; margin: 0; padding: 0; border: 0; box-shadow: none; } .aula-mermaid-export, pre, blockquote { break-inside: avoid; } h1, h2, h3 { break-after: avoid; } }
</style>
</head>
<body>
<main>
<h1 class="title">${safeTitle}</h1>
<p class="subtitle">Exportado desde Aula Documentos — Aula Kanban</p>
<article>${withDiagrams}</article>
</main>
</body>
</html>
`;
}
