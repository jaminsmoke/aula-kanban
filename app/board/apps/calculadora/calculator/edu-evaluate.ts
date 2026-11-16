import type { ComputeEngine } from "@cortex-js/compute-engine";
import { setEngineStatus } from "./engine-status";
import { formatNumber, type Evaluation } from "./calculator-evaluation";

export type { Evaluation } from "./calculator-evaluation";

let engine: Promise<ComputeEngine> | null = null;

/**
 * Carga el motor de cálculo una sola vez, al primer uso.
 * @returns Promesa con la instancia compartida del motor.
 */
function getEngine(): Promise<ComputeEngine> {
  if (!engine) {
    setEngineStatus("loading");
    engine = import("@cortex-js/compute-engine")
      .then(({ ComputeEngine }) => new ComputeEngine())
      .then((instance) => {
        setEngineStatus("ready");
        return instance;
      })
      .catch((error: unknown) => {
        engine = null;
        setEngineStatus("error");
        throw error;
      });
  }
  return engine;
}

/**
 * Empieza a cargar el motor de cálculo antes de que haga falta.
 */
export function preloadEngine(): void {
  void getEngine().catch(() => {
    // El error se conserva en `engine-status`; el siguiente uso reintenta.
  });
}

/**
 * Evalúa una expresión escrita en LaTeX.
 * @param latex - Expresión tal como la entrega el editor.
 * @returns El resultado exacto y aproximado, o el motivo del error.
 */
export async function evaluateLatex(latex: string): Promise<Evaluation> {
  const input = latex.trim();
  if (!input) return { kind: "empty" };

  try {
    const compute = await getEngine();
    const expression = compute.parse(input);
    if (!expression.isValid) {
      return { kind: "error", message: "La expresión no está bien escrita. Revisa la fórmula." };
    }
    const exact = expression.evaluate();
    const numeric = expression.N();
    if (!exact.isValid || !numeric.isValid) {
      return { kind: "error", message: "No se pudo calcular esa expresión." };
    }
    return {
      kind: "value",
      exact: exact.toString(),
      latex: exact.latex,
      numeric: numeric.isNumber === true ? formatNumber(numeric.toString()) : null,
      isNumeric: numeric.isNumber === true,
    };
  } catch {
    return { kind: "error", message: "No se pudo calcular. Revisa la fórmula e inténtalo de nuevo." };
  }
}

/**
 * Evalúa varias líneas en orden, compartiendo las variables asignadas.
 * Una línea `x = 5` guarda la variable para las siguientes; el ámbito se
 * reinicia al terminar para no arrastrar valores entre cálculos.
 * @param latexLines - Una expresión por línea.
 * @returns Un resultado por línea, en el mismo orden.
 */
export async function evaluateLines(latexLines: string[]): Promise<Evaluation[]> {
  try {
    const compute = await getEngine();
    compute.pushScope();
    try {
      const results: Evaluation[] = [];
      for (const line of latexLines) {
        const input = line.trim();
        if (!input) {
          results.push({ kind: "empty" });
          continue;
        }
        const expression = compute.parse(input);
        if (!expression.isValid) {
          results.push({ kind: "error", message: "Revisa esta línea." });
          continue;
        }
        const json = expression.json;
        if (Array.isArray(json) && json[0] === "Equal" && typeof json[1] === "string") {
          const value = compute.box(json[2]).evaluate();
          if (!value.isValid) {
            results.push({ kind: "error", message: "No se pudo asignar el valor." });
            continue;
          }
          compute.assign(json[1], value);
          results.push({
            kind: "value",
            exact: value.toString(),
            latex: value.latex,
            numeric: value.isNumber === true ? formatNumber(value.toString()) : null,
            isNumeric: value.isNumber === true,
          });
          continue;
        }
        const exact = expression.evaluate();
        const numeric = expression.N();
        if (!exact.isValid || !numeric.isValid) {
          results.push({ kind: "error", message: "No se pudo calcular esta línea." });
          continue;
        }
        results.push({
          kind: "value",
          exact: exact.toString(),
          latex: exact.latex,
          numeric: numeric.isNumber === true ? formatNumber(numeric.toString()) : null,
          isNumeric: numeric.isNumber === true,
        });
      }
      return results;
    } finally {
      compute.popScope();
    }
  } catch {
    return latexLines.map(() => ({ kind: "error", message: "No se pudo calcular." }) as Evaluation);
  }
}
