import { describe, expect, it } from "vitest";
import {
  MAX_ELEMENTOS_ANADIDOS,
  MAX_TEXTO_ELEMENTO,
  agregarElementos,
  construirElementosExcalidraw,
  parseEscena,
  type ElementoPizarra,
} from "./excalidraw-elements";

/**
 * Generadores deterministas para las pruebas.
 * @returns Identificadores y nonces incrementales.
 */
function generadores() {
  let secuencia = 0;
  return {
    generarId: () => `elemento-${++secuencia}`,
    generarNonce: () => secuencia,
    ahora: 100,
  };
}

describe("constructor de elementos Excalidraw", () => {
  it("construye los cuatro tipos con los campos que Excalidraw necesita", () => {
    const [texto, rectangulo, elipse, flecha] = construirElementosExcalidraw([
      { tipo: "texto", texto: "Hola", x: 10, y: 20 },
      { tipo: "rectangulo", x: 1, y: 2, ancho: 100, alto: 60, color: "#ff0000" },
      { tipo: "elipse", x: 3, y: 4, ancho: 80, alto: 40 },
      { tipo: "flecha", x: 5, y: 6, ancho: 120, alto: 30 },
    ], generadores());

    expect(texto).toMatchObject({ type: "text", text: "Hola", originalText: "Hola", fontSize: 20 });
    expect(rectangulo).toMatchObject({ type: "rectangle", width: 100, height: 60, strokeColor: "#ff0000" });
    expect(elipse).toMatchObject({ type: "ellipse", width: 80, height: 40 });
    expect(flecha).toMatchObject({
      type: "arrow",
      points: [[0, 0], [120, 30]],
      endArrowhead: "arrow",
    });
    expect(texto).toMatchObject({ version: 1, versionNonce: 1, updated: 100, isDeleted: false });
  });

  it("no comparte identificadores ni modifica appState, files o campos desconocidos", () => {
    const escena = {
      type: "excalidraw",
      version: 2,
      custom: "se conserva",
      elements: [{ id: "anterior", version: 2 }],
      appState: { zoom: 1 },
      files: { f1: { dataURL: "/api/files/f1" } },
    };
    const nuevos = construirElementosExcalidraw([
      { tipo: "rectangulo", x: 0, y: 0, ancho: 10, alto: 10 },
    ], generadores());
    const merged = agregarElementos(escena, nuevos);
    expect(merged.custom).toBe("se conserva");
    expect(merged.appState).toEqual({ zoom: 1 });
    expect(merged.files).toEqual({ f1: { dataURL: "/api/files/f1" } });
    expect(merged.elements).toHaveLength(2);
    expect(new Set((merged.elements as Array<{ id: string }>).map((element) => element.id)).size).toBe(2);
  });

  it("interpreta una escena vacía y rechaza JSON sin elements[]", () => {
    expect(parseEscena("")).toEqual({});
    expect(parseEscena('{"elements":[]}')).toEqual({ elements: [] });
    expect(parseEscena("{no es json")).toBeNull();
    expect(parseEscena('{"otra":true}')).toBeNull();
  });

  it("rechaza listas fuera del límite, texto vacío, coordenadas y tipos no permitidos", () => {
    const demasiados = Array.from({ length: MAX_ELEMENTOS_ANADIDOS + 1 }, () => ({ tipo: "rectangulo" as const, x: 0, y: 0, ancho: 1, alto: 1 }));
    expect(() => construirElementosExcalidraw(demasiados, generadores())).toThrow("cantidad");
    expect(() => construirElementosExcalidraw([{ tipo: "texto", texto: "   ", x: 0, y: 0 }], generadores())).toThrow("texto");
    expect(() => construirElementosExcalidraw([{ tipo: "texto", texto: "x".repeat(MAX_TEXTO_ELEMENTO + 1), x: 0, y: 0 }], generadores())).toThrow("texto");
    expect(() => construirElementosExcalidraw([{ tipo: "rectangulo", x: Number.NaN, y: 0, ancho: 1, alto: 1 }], generadores())).toThrow("x");
    expect(() => construirElementosExcalidraw([{ tipo: "cuadro" } as unknown as ElementoPizarra], generadores())).toThrow("tipo");
  });

  it("rechaza colores que no son hexadecimales", () => {
    expect(() => construirElementosExcalidraw([{ tipo: "rectangulo", x: 0, y: 0, ancho: 1, alto: 1, color: "rojo" }], generadores())).toThrow("color");
  });
});
