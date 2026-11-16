import { describe, expect, it } from "vitest";
import { evaluateLatex, evaluateLines } from "./edu-evaluate";

describe("Evaluación de ecuaciones", () => {
  it("calcula una operación aritmética", async () => {
    const result = await evaluateLatex("2+3\\times4");
    expect(result).toMatchObject({ kind: "value", exact: "14", numeric: "14" });
  });

  it("calcula fracciones y conserva el resultado exacto", async () => {
    const result = await evaluateLatex("\\frac{1}{2}+\\frac{1}{3}");
    expect(result.kind).toBe("value");
    if (result.kind === "value") {
      expect(result.exact).toBe("5/6");
      expect(result.numeric).toBe("0,8333333333");
    }
  });

  it("detecta expresiones vacías o mal escritas", async () => {
    expect((await evaluateLatex("   ")).kind).toBe("empty");
    expect((await evaluateLatex("2+")).kind).toBe("error");
  });

  it("comparte variables entre líneas y reinicia el ámbito", async () => {
    const results = await evaluateLines(["x=5", "y=2", "x+y", "x*y"]);
    expect(results[2]).toMatchObject({ kind: "value", exact: "7", numeric: "7" });
    expect(results[3]).toMatchObject({ kind: "value", exact: "10", numeric: "10" });

    const again = await evaluateLines(["x+y"]);
    expect(again[0].kind).toBe("value");
    if (again[0].kind === "value") expect(again[0].numeric).not.toBe("7");
  });
});
