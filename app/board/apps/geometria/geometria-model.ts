/** Presets de construcción disponibles en el lienzo. */
export type PresetId = "libre" | "triangulo" | "circunferencia" | "rectas";

/** Ficha visible de un preset de construcción. */
export type PresetInfo = {
  id: PresetId;
  label: string;
  description: string;
  pointCount: number;
  elementCount: number;
};

/** Presets en el orden del selector. */
export const PRESETS: PresetInfo[] = [
  {
    id: "libre",
    label: "Libre",
    description: "Dos puntos y un segmento para empezar a construir.",
    pointCount: 2,
    elementCount: 1,
  },
  {
    id: "triangulo",
    label: "Triángulo",
    description: "Tres vértices unidos por sus tres lados.",
    pointCount: 3,
    elementCount: 3,
  },
  {
    id: "circunferencia",
    label: "Circunferencia",
    description: "Centro, radio y una medida que cambia al arrastrar.",
    pointCount: 2,
    elementCount: 3,
  },
  {
    id: "rectas",
    label: "Rectas",
    description: "Dos rectas que se cruzan en el plano.",
    pointCount: 4,
    elementCount: 2,
  },
];

/**
 * Ficha de un preset de construcción.
 * @param id - Identificador del preset.
 * @returns La ficha correspondiente o la del preset libre.
 */
export function presetInfo(id: PresetId): PresetInfo {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}

/** Funciones que se pueden superponer al lienzo. */
export type FunctionId = "ninguna" | "parabola" | "seno" | "lineal";

/** Ficha visible de una función representable. */
export type FunctionInfo = {
  id: Exclude<FunctionId, "ninguna">;
  label: string;
  expression: string;
  color: string;
};

/** Funciones en el orden del selector. */
export const FUNCTIONS: FunctionInfo[] = [
  { id: "parabola", label: "Parábola", expression: "y = 0,15x² − 2", color: "#d9688a" },
  { id: "seno", label: "Seno", expression: "y = 1,5 · sen(x)", color: "#2f9e8f" },
  { id: "lineal", label: "Recta", expression: "y = 0,6x − 0,5", color: "#e5a62e" },
];

/**
 * Evalúa una función en un punto.
 * @param id - Función que se quiere evaluar.
 * @param x - Coordenada X.
 * @returns La coordenada Y de la función.
 */
export function evaluateFunction(id: Exclude<FunctionId, "ninguna">, x: number): number {
  switch (id) {
    case "parabola":
      return 0.15 * x * x - 2;
    case "seno":
      return 1.5 * Math.sin(x);
    case "lineal":
      return 0.6 * x - 0.5;
  }
}

/**
 * Nombre de un punto según su orden: A, B, …, Z, P27…
 * @param index - Posición del punto, empezando en cero.
 * @returns Letra o identificador del punto.
 */
export function pointName(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  return `P${index + 1}`;
}

/**
 * Distancia euclídea entre dos puntos.
 * @param x1 - Coordenada X del primer punto.
 * @param y1 - Coordenada Y del primer punto.
 * @param x2 - Coordenada X del segundo punto.
 * @param y2 - Coordenada Y del segundo punto.
 * @returns Distancia entre ambos puntos.
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Distancia con dos decimales, para las etiquetas del lienzo.
 * @param value - Distancia que se quiere formatear.
 * @returns Texto con dos decimales y coma decimal.
 */
export function formatDistance(value: number): string {
  return value.toFixed(2).replace(".", ",");
}
