import { describe, expect, it } from "vitest";
import { MAX_REFERENCE_DEPTH, idsDeArchivo, referenciasDeDocumento, referenciasDeJson } from "./references";

describe("referencias de archivos", () => {
  it("extrae ids de URLs internas sin repetirlos y conserva el orden", () => {
    const texto = "Imagen /api/files/aaaa y /api/files/bbbb; de nuevo /api/files/aaaa";
    expect(idsDeArchivo(texto)).toEqual(["aaaa", "bbbb"]);
    expect(idsDeArchivo("")).toEqual([]);
    expect(idsDeArchivo("sin archivos")).toEqual([]);
  });

  it("ignora URLs externas, rutas relativas y fragmentos parecidos", () => {
    const texto = [
      "https://sitio.test/api/files/aaaa",
      "//cdn.test/api/files/bbbb",
      "/otra/api/files/cccc",
      "texto/api/files/dddd",
      "/api/files/",
      "/api/files/../secreto",
    ].join(" ");
    expect(idsDeArchivo(texto)).toEqual([]);
  });

  it("recorre documentos anidados y solo mira los valores", () => {
    const documento = {
      "/api/files/clave": "no es un valor",
      files: { f1: { dataURL: "/api/files/aaaa" } },
      elements: [{ link: null }, { custom: ["/api/files/bbbb", "/api/files/aaaa"] }],
      appState: { zoom: 1 },
    };
    expect(referenciasDeJson(documento)).toEqual(["aaaa", "bbbb"]);
    expect(referenciasDeJson(null)).toEqual([]);
  });

  it("interpreta el JSON guardado y falla cerrado si está corrupto", () => {
    expect(referenciasDeDocumento("")).toEqual([]);
    expect(referenciasDeDocumento("   ")).toEqual([]);
    expect(referenciasDeDocumento('{"files":{"f1":{"dataURL":"/api/files/aaaa"}}}')).toEqual(["aaaa"]);
    expect(referenciasDeDocumento("{no es json")).toBeNull();
    expect(referenciasDeDocumento('"texto con /api/files/bbbb"')).toEqual(["bbbb"]);
  });

  it("no se desborda con documentos muy anidados", () => {
    let anidado: unknown = "/api/files/profundo";
    for (let i = 0; i < MAX_REFERENCE_DEPTH + 10; i += 1) anidado = { siguiente: anidado };
    expect(() => referenciasDeJson(anidado)).not.toThrow();
  });
});
