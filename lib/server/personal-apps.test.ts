import { describe, expect, it } from "vitest";
import {
  PersonalAppsError,
  applyPreferences,
  describePersonalApps,
  orderPersonalApps,
  parsePersonalItems,
} from "./personal-apps";

describe("applyPreferences", () => {
  it("aplica favorito y posición solo a apps del catálogo", () => {
    const items = applyPreferences(new Set(["mermaid"]), [
      { id: "mermaid", favorite: true, position: 2, folder: "Diagramas" },
    ]);
    expect(items.find((item) => item.id === "mermaid")).toEqual({
      id: "mermaid", favorite: true, position: 2, folder: "Diagramas", installed: true,
    });
    expect(items.find((item) => item.id === "blockly")).toEqual({
      id: "blockly", favorite: false, position: null, folder: null, installed: false,
    });
  });
});

describe("orderPersonalApps", () => {
  it("prioriza favoritas por posición y el resto por el catálogo", () => {
    const ordered = orderPersonalApps([
      { id: "mermaid", favorite: false, position: null, folder: null, installed: true },
      { id: "blockly", favorite: true, position: 5, folder: null, installed: true },
      { id: "excalidraw", favorite: true, position: 1, folder: null, installed: true },
      { id: "calculadora", favorite: false, position: 0, folder: null, installed: true },
    ]);
    expect(ordered.map((item) => item.id)).toEqual(["excalidraw", "blockly", "calculadora", "mermaid"]);
  });
});

describe("parsePersonalItems", () => {
  it("acepta la selección completa de la interfaz", () => {
    expect(parsePersonalItems({ items: [
      { id: "mermaid", favorite: true, position: 0, folder: "  Mis   diagramas  " },
      { id: "blockly", favorite: false },
    ] })).toEqual([
      { id: "mermaid", favorite: true, position: 0, folder: "Mis diagramas" },
      { id: "blockly", favorite: false, position: null, folder: null },
    ]);
  });

  it("rechaza ids desconocidos, repetidos y posiciones inválidas", () => {
    expect(() => parsePersonalItems({ items: [{ id: "inexistente", favorite: true }] }))
      .toThrowError(PersonalAppsError);
    expect(() => parsePersonalItems({ items: [
      { id: "mermaid", favorite: true },
      { id: "mermaid", favorite: false },
    ] })).toThrowError(PersonalAppsError);
    expect(() => parsePersonalItems({ items: [{ id: "mermaid", favorite: true, position: -1 }] }))
      .toThrowError(PersonalAppsError);
    expect(() => parsePersonalItems({ items: "no" })).toThrowError(PersonalAppsError);
    expect(() => parsePersonalItems({ items: [{ id: "mermaid", favorite: true, folder: 3 }] })).toThrowError(PersonalAppsError);
    expect(() => parsePersonalItems({ items: [{ id: "mermaid", favorite: true, folder: "x".repeat(41) }] })).toThrowError(PersonalAppsError);
  });
});

describe("describePersonalApps", () => {
  it("añade nombre, etiqueta y categoría del catálogo", () => {
    const described = describePersonalApps([
      { id: "mermaid", favorite: true, position: 0, folder: "Mis diagramas", installed: true },
    ]);
    expect(described[0]).toMatchObject({ id: "mermaid", name: "Diagramas", category: "Educación" });
  });
});
