import { describe, expect, it } from "vitest";
import { tokenizeMermaidLine } from "./mermaid-highlight";

describe("resaltado de Diagramas", () => {
  it("conserva el texto original y separa palabras clave", () => {
    const tokens = tokenizeMermaidLine("flowchart TD");
    expect(tokens.map((token) => token.text).join("")).toBe("flowchart TD");
    expect(tokens).toEqual([
      { text: "flowchart", kind: "keyword" },
      { text: " ", kind: "plain" },
      { text: "TD", kind: "plain" },
    ]);
  });

  it("reconoce flechas, cadenas, números y comentarios", () => {
    const tokens = tokenizeMermaidLine('A["Texto"] --> B 2 %% nota');
    expect(tokens.map((token) => token.text).join("")).toBe('A["Texto"] --> B 2 %% nota');
    expect(tokens.some((token) => token.kind === "string" && token.text === '"Texto"')).toBe(true);
    expect(tokens.some((token) => token.kind === "arrow" && token.text === "-->")).toBe(true);
    expect(tokens.some((token) => token.kind === "number" && token.text === "2")).toBe(true);
    expect(tokens.at(-1)).toEqual({ text: "%% nota", kind: "comment" });
  });

  it("mantiene comentarios y líneas vacías sin perder caracteres", () => {
    expect(tokenizeMermaidLine("%% título")).toEqual([{ text: "%% título", kind: "comment" }]);
    expect(tokenizeMermaidLine("")).toEqual([]);
  });
});
