import { describe, expect, it } from "vitest";
import { createBall, createScene, PRESETS } from "./fisica-model";

describe("modelo de Física 2D", () => {
  it("declara los cuatro experimentos", () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(["gravedad", "colisiones", "muelle", "pendulo"]);
  });

  it.each(["gravedad", "colisiones", "muelle", "pendulo"] as const)("crea una escena con suelo y paredes para %s", (preset) => {
    const scene = createScene(preset);
    expect(scene.engine).toBeTruthy();
    expect(scene.bodies.some((body) => body.label === "suelo")).toBe(true);
    expect(scene.bodies.some((body) => body.label === "pared izquierda")).toBe(true);
    expect(scene.bodies.some((body) => body.label === "pared derecha")).toBe(true);
    expect(scene.bodies.length).toBeGreaterThan(3);
  });

  it("añade restricciones al muelle y al péndulo", () => {
    expect(createScene("muelle").constraints).toHaveLength(1);
    expect(createScene("pendulo").constraints).toHaveLength(1);
    expect(createScene("gravedad").constraints).toHaveLength(0);
  });

  it("crea pelotas nuevas con un radio válido", () => {
    const ball = createBall(120, 40, 2);
    expect(ball.label).toBe("pelota nueva 3");
    expect(ball.circleRadius).toBeGreaterThan(0);
  });
});
