/** Tipo de token para el resaltado del editor. */
export type MermaidTokenKind = "plain" | "comment" | "keyword" | "string" | "arrow" | "number";

/** Fragmento de una línea de código. */
export type MermaidToken = {
  text: string;
  kind: MermaidTokenKind;
};

const KEYWORDS = new Set([
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitGraph",
  "quadrantChart",
  "requirementDiagram",
  "C4Context",
  "subgraph",
  "end",
  "participant",
  "actor",
  "note",
  "loop",
  "alt",
  "else",
  "opt",
  "par",
  "and",
  "rect",
  "activate",
  "deactivate",
  "title",
  "section",
  "dateFormat",
  "axisFormat",
  "excludes",
  "click",
  "style",
  "classDef",
  "linkStyle",
  "accTitle",
  "accDescr",
]);

const TOKEN_PATTERN = /%%\{[^}]*\}%%|%%.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|(?:<?[-.=~]+>+|--[ox])|[A-Za-z_][\w-]*|\d+/g;

/**
 * Separa una línea en tokens conservando exactamente su texto.
 * @param line - Línea de código Mermaid.
 * @returns Tokens con su tipo semántico.
 */
export function tokenizeMermaidLine(line: string): MermaidToken[] {
  const tokens: MermaidToken[] = [];
  let cursor = 0;
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ text: line.slice(cursor, index), kind: "plain" });
    const text = match[0];
    let kind: MermaidTokenKind = "plain";
    if (text.startsWith("%%{")) kind = "comment";
    else if (text.startsWith("%%")) kind = "comment";
    else if (text.startsWith('"') || text.startsWith("'")) kind = "string";
    else if (/^(?:<?[-.=~]+>+|--[ox])$/.test(text)) kind = "arrow";
    else if (/^\d+$/.test(text)) kind = "number";
    else if (KEYWORDS.has(text)) kind = "keyword";
    tokens.push({ text, kind });
    cursor = index + text.length;
  }
  if (cursor < line.length) tokens.push({ text: line.slice(cursor), kind: "plain" });
  return tokens;
}
