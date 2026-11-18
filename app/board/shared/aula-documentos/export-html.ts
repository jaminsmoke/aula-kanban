import { generateHTML } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
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
    const pre = document.createElement("pre");
    const codeElement = document.createElement("code");
    codeElement.textContent = code || "Diagrama sin código.";
    pre.appendChild(codeElement);
    block.replaceChildren(pre);
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
  @media print { body { background: #fff; } main { width: auto; max-width: none; margin: 0; padding: 0; border: 0; box-shadow: none; } }
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
