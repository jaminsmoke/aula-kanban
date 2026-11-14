import { describe, expect, it } from "vitest";
import { BLOCKLY_STARTER } from "./blockly-starter";
import { BLOCKLY_TOOLBOX } from "./blockly-toolbox";

describe("configuración de Blockly", () => {
  it("mantiene las categorías y bloques principales", () => {
    const categories = BLOCKLY_TOOLBOX.contents.map((category) => category.name);
    expect(categories).toEqual(["Lógica", "Bucles", "Matemáticas", "Texto", "Variables", "Funciones"]);
    const logic = BLOCKLY_TOOLBOX.contents[0].contents?.map((block) => block.type);
    expect(logic).toContain("controls_if");
  });

  it("conserva el programa de ejemplo", () => {
    expect(BLOCKLY_STARTER.blocks.blocks).toHaveLength(2);
    expect(BLOCKLY_STARTER.blocks.blocks[0].type).toBe("text_print");
  });
});
