import { describe, expect, it } from "vitest";
import { leerEstadoBlockly, validarEstadoBlockly } from "./serialization";

/** Estado de ejemplo con la misma forma que Blockly serializa. */
const programa = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: "text_print",
        x: 48,
        y: 40,
        inputs: { TEXT: { shadow: { type: "text", fields: { TEXT: "Hola" } } } },
      },
    ],
    customBlockField: "se conserva",
  },
  variables: [{ name: "contador", id: "v1" }],
  customTopLevel: { version: 7 },
};

describe("serialización de Blockly", () => {
  it("acepta un estado con blocks.blocks[] y conserva el resto de campos", () => {
    expect(validarEstadoBlockly(programa)).toBe(programa);
    expect(validarEstadoBlockly(programa)?.customTopLevel).toEqual({ version: 7 });
    expect(validarEstadoBlockly(programa)?.variables).toEqual([{ name: "contador", id: "v1" }]);
    expect((validarEstadoBlockly(programa)?.blocks as Record<string, unknown>).customBlockField).toBe("se conserva");
  });

  it("acepta un workspace vacío", () => {
    expect(validarEstadoBlockly({ blocks: { blocks: [] } })).toEqual({ blocks: { blocks: [] } });
  });

  it("rechaza valores que no son un workspace de Blockly", () => {
    for (const value of [
      null,
      [],
      "texto",
      {},
      { blocks: null },
      { blocks: [] },
      { blocks: { languageVersion: 0 } },
      { blocks: { blocks: {} } },
    ]) {
      expect(validarEstadoBlockly(value), JSON.stringify(value)).toBeNull();
    }
  });

  it("interpreta JSON y rechaza texto corrupto o con forma incorrecta", () => {
    expect(leerEstadoBlockly(JSON.stringify(programa))).toEqual(programa);
    expect(leerEstadoBlockly("{no es json")).toBeNull();
    expect(leerEstadoBlockly('{"blocks":{"blocks":[]},"custom":true}')).toEqual({ blocks: { blocks: [] }, custom: true });
    expect(leerEstadoBlockly('{"blocks":[]}')).toBeNull();
  });
});
