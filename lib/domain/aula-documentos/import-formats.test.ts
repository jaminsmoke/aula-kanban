import { describe, expect, it } from "vitest";
import { AULA_DOCUMENT_JSON_MAX_LENGTH, AULA_DOCUMENT_SCHEMA_VERSION } from "./document";
import { importJsonDocument, importPlainTextDocument } from "./import-formats";
import { AULA_DOCUMENT_MARKDOWN_MAX_LENGTH } from "./markdown";

describe("importación de TXT y JSON", () => {
  it("convierte TXT en párrafos literales", () => {
    const result = importPlainTextDocument("# Título\n\n*Texto* con **marcas**", "notas");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.source).toBe("text");
    expect(result.preview.document.title).toBe("notas");
    expect(result.preview.document.content.content).toMatchObject([
      { type: "paragraph", content: [{ type: "text", text: "# Título" }] },
      { type: "paragraph", content: [{ type: "text", text: "*Texto* con **marcas**" }] },
    ]);
    expect(result.preview.warnings).toHaveLength(1);
  });

  it("rechaza texto vacío o demasiado grande", () => {
    expect(importPlainTextDocument(" \n\n ")).toEqual({ ok: false, message: "El texto está vacío." });
    expect(importPlainTextDocument("x".repeat(AULA_DOCUMENT_MARKDOWN_MAX_LENGTH + 1))).toEqual({
      ok: false,
      message: "El texto supera el tamaño permitido.",
    });
  });

  it("acepta un documento JSON canónico", () => {
    const document = {
      schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
      title: "Documento JSON",
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Contenido JSON." }] }],
      },
    };
    const result = importJsonDocument(JSON.stringify(document));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.source).toBe("json");
    expect(result.preview.document.title).toBe("Documento JSON");
    expect(result.preview.document.content.content?.[0]).toMatchObject({ type: "paragraph" });
    expect(result.preview.warnings).toHaveLength(0);
  });

  it("rechaza JSON inválido, fuera de esquema o demasiado grande", () => {
    expect(importJsonDocument(" ")).toEqual({ ok: false, message: "El JSON está vacío." });
    expect(importJsonDocument("{")).toEqual({ ok: false, message: "El archivo no contiene JSON válido." });
    expect(importJsonDocument(JSON.stringify({ hello: "world" }))).toMatchObject({ ok: false });
    expect(importJsonDocument("x".repeat(AULA_DOCUMENT_JSON_MAX_LENGTH + 1))).toEqual({
      ok: false,
      message: "El JSON supera el tamaño permitido.",
    });
  });
});
