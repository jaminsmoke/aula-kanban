/** Programa de ejemplo que se ofrece cuando el lienzo está vacío. */
export const BLOCKLY_STARTER = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: "text_print",
        x: 48,
        y: 40,
        inputs: {
          TEXT: { shadow: { type: "text", fields: { TEXT: "¡Hola, aula!" } } },
        },
      },
      {
        type: "controls_repeat_ext",
        x: 48,
        y: 130,
        inputs: {
          TIMES: { shadow: { type: "math_number", fields: { NUM: 3 } } },
          DO: {
            block: {
              type: "text_print",
              inputs: {
                TEXT: { shadow: { type: "text", fields: { TEXT: "Repitiendo…" } } },
              },
            },
          },
        },
      },
    ],
  },
};
