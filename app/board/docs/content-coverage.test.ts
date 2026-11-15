import { describe, expect, it } from "vitest";
import { BOARD_VIEWS, type BoardView } from "../../../lib/domain/board-url";
import { NATIVE_APPS } from "../../../lib/native-apps";
import { MCP_TOOLS } from "../../../lib/server/mcp/registro";
import { docSections, type DocSection } from "./content";

/**
 * Texto plano de una sección, sin presentación: sirve para buscar los
 * literales de la app que la ayuda debe nombrar.
 * @param seccion - Sección de la documentación.
 * @returns Título, entradilla y todo el texto de sus bloques.
 */
function textoDe(seccion: DocSection): string {
  const bloques = seccion.blocks.flatMap((bloque) => {
    switch (bloque.type) {
      case "definitions":
        return bloque.items.flatMap((item) => [item.term, item.text]);
      case "steps":
        return bloque.items;
      case "image":
        return [bloque.alt, bloque.caption];
      default:
        return [bloque.text];
    }
  });
  return [seccion.title, seccion.lead, ...bloques].join("\n");
}

const ayuda = docSections.map(textoDe).join("\n");

/** Nombre con el que la ayuda llama a cada vista del tablero. */
const nombreDeVista: Record<BoardView, string> = {
  clase: "Clase",
  administracion: "Administración",
  espacio: "Tienda",
  ajustes: "Ajustes",
  documentacion: "Documentación",
};

describe("cobertura de la documentación", () => {
  it("nombra todas las vistas del tablero", () => {
    expect(Object.keys(nombreDeVista).sort()).toEqual([...BOARD_VIEWS].sort());
    for (const vista of BOARD_VIEWS) expect(ayuda, vista).toContain(nombreDeVista[vista]);
  });

  it("menciona todas las aplicaciones del catálogo con su versión", () => {
    for (const app of NATIVE_APPS) {
      expect(ayuda, app.id).toContain(app.name);
      expect(ayuda, app.id).toContain(app.appVersion);
    }
  });

  it("menciona todas las herramientas del registro MCP", () => {
    // Con límites de palabra: `ampliar_app_x` no vale como `ampliar_app`.
    for (const tool of MCP_TOOLS) expect(ayuda, tool.name).toMatch(new RegExp(`\\b${tool.name}\\b`));
  });
});
