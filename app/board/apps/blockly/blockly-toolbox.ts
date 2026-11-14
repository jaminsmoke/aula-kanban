/** Bloques disponibles en la caja de herramientas. */
export const BLOCKLY_TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Lógica",
      colour: "#5b80a5",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
      ],
    },
    {
      kind: "category",
      name: "Bucles",
      colour: "#5ba55b",
      contents: [
        { kind: "block", type: "controls_repeat_ext" },
        { kind: "block", type: "controls_whileUntil" },
        { kind: "block", type: "controls_for" },
        { kind: "block", type: "controls_flow_statements" },
      ],
    },
    {
      kind: "category",
      name: "Matemáticas",
      colour: "#5b67a5",
      contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic" },
        { kind: "block", type: "math_single" },
        { kind: "block", type: "math_random_int" },
        { kind: "block", type: "math_number_property" },
      ],
    },
    {
      kind: "category",
      name: "Texto",
      colour: "#5ba58c",
      contents: [
        { kind: "block", type: "text" },
        { kind: "block", type: "text_join" },
        { kind: "block", type: "text_print" },
        { kind: "block", type: "text_length" },
      ],
    },
    {
      kind: "category",
      name: "Variables",
      colour: "#a55b80",
      custom: "VARIABLE",
    },
    {
      kind: "category",
      name: "Funciones",
      colour: "#995ba5",
      custom: "PROCEDURE",
    },
  ],
};
