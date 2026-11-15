import { describe, expect, it } from "vitest";
import { evaluateBasic } from "./basic-evaluate";

describe("Evaluación de la calculadora básica", () => {
  it.each([
    ["2+3*4", "14", "14"],
    ["(2+3)*4", "20", "20"],
    ["2(3)", "6", "6"],
    ["0.1+0.2", "0.3", "0,3"],
    ["1.5+1.5", "3", "3"],
    ["1/3", "1/3", "0,3333333333"],
    ["100/3", "100/3", "33,3333333333"],
    ["2^10", "1024", "1024"],
    ["-3^2", "-9", "-9"],
    ["(-3)^2", "9", "9"],
    ["5!", "120", "120"],
    ["50/100", "0.5", "0,5"],
  ])("evalúa %s sin el motor", (input, exact, numeric) => {
    expect(evaluateBasic(input)).toMatchObject({ kind: "value", exact, numeric });
  });

  it("devuelve vacío para una entrada vacía", () => {
    expect(evaluateBasic("   ")).toEqual({ kind: "empty" });
  });

  it("detecta una sintaxis incompleta", () => {
    expect(evaluateBasic("2+")).toMatchObject({
      kind: "error",
      message: "La expresión no está bien escrita. Revisa la fórmula.",
    });
  });

  it.each(["\\sqrt(9)", "2^0.5", "3.5!", "1/0", "0/0"])(
    "delega en el motor la expresión %s",
    (input) => {
      expect(evaluateBasic(input)).toBeNull();
    },
  );
});
