/**
 * Catálogo compartido de aplicaciones nativas. Es data pura (sin React) para
 * poder importarlo desde el servidor (API) y desde la interfaz.
 */

export type NativeCategory = "Aula" | "Pizarras" | "Programación" | "Diagramas";

export const SPACE_CATEGORIES: NativeCategory[] = ["Aula", "Pizarras", "Programación", "Diagramas"];

/** Versión de Aula Store como producto, independiente de las apps y del Site. */
export const AULA_STORE_VERSION = "1.0.0";

export const NATIVE_APP_IDS = ["excalidraw", "edu-tools", "blockly", "mermaid"] as const;

export type NativeAppId = (typeof NATIVE_APP_IDS)[number];

/** Paquete npm y versión exacta que forma parte de una app. */
export type NativeAppPackage = {
  name: string;
  version: string;
};

export type NativeAppMeta = {
  id: NativeAppId;
  name: string;
  tagline: string;
  description: string;
  category: NativeCategory;
  cover: string;
  features: readonly string[];
  /** Versión de nuestra integración, independiente de la versión del Site. */
  appVersion: string;
  /** Etiqueta opcional para la versión; por defecto, el nombre de la app. */
  versionLabel?: string;
  /** Paquete upstream principal y versión instalada. */
  upstream: NativeAppPackage;
  /** Piezas adicionales que añade nuestra integración. */
  extras?: readonly NativeAppPackage[];
  /** Tamaño inicial de la ventana en Mi espacio. */
  window: { width: number; height: number };
};

export const NATIVE_APPS: readonly NativeAppMeta[] = [
  {
    id: "excalidraw",
    name: "Excalidraw",
    tagline: "Pizarra colaborativa para dibujar, explicar y anotar.",
    description: "Pizarra del espacio de trabajo con Excalidraw (MIT): dibuja y colabora en directo.",
    category: "Pizarras",
    cover: "/store/excalidraw.png",
    features: ["Lienzo infinito con formas, texto y flechas", "Ideal para esquemas y explicaciones en directo", "Exporta el resultado a imagen"],
    appVersion: "1.0.0",
    upstream: { name: "@excalidraw/excalidraw", version: "0.18.1" },
    window: { width: 880, height: 560 },
  },
  {
    id: "edu-tools",
    name: "Herramientas de aula",
    tagline: "Calculadora científica, tabla periódica, medición y lectura.",
    description: "Calculadora con pantalla, modo científico, memoria e historial; ecuaciones por líneas con variables, tabla periódica, medición y lectura en voz alta (MIT).",
    category: "Aula",
    cover: "/store/edu-tools.png",
    features: ["Calculadora básica y científica con memoria e historial", "Tabla periódica con ficha, modelo atómico e historia", "Regla, transportador y lectura en voz alta"],
    appVersion: "1.0.0",
    upstream: { name: "@smst/edu-tools", version: "2.2.1" },
    extras: [{ name: "@cortex-js/compute-engine", version: "0.188.0" }],
    window: { width: 1120, height: 760 },
  },
  {
    id: "blockly",
    name: "Programación por bloques",
    tagline: "Programa con bloques y obtén código JavaScript o Python.",
    description: "Editor de bloques tipo Scratch con Blockly (Apache-2.0): lógica, bucles, matemáticas y texto, guardado por proyecto y código generado en JavaScript y Python.",
    category: "Programación",
    cover: "/store/blockly.png",
    features: ["Bloques de lógica, bucles, matemáticas y texto", "Código generado en JavaScript y Python", "Guardado por proyecto y ejecución de la salida"],
    appVersion: "1.0.0",
    upstream: { name: "blockly", version: "13.4.0" },
    window: { width: 1080, height: 720 },
  },
  {
    id: "mermaid",
    name: "Diagramas",
    tagline: "Escribe el diagrama en texto y míralo al instante.",
    description: "Diagramas de flujo, secuencia, Gantt, clases y líneas de tiempo con Mermaid (MIT): vista previa y exportación SVG.",
    category: "Diagramas",
    cover: "/store/mermaid.png",
    features: ["Flujos, secuencia, Gantt, clases y estados", "Plantillas listas y vista previa en vivo", "Guardado por proyecto y exportación SVG"],
    appVersion: "1.0.0",
    upstream: { name: "mermaid", version: "12.3.0" },
    window: { width: 1120, height: 720 },
  },
];

/**
 * Busca la ficha de una app del catálogo.
 * @param id - Identificador de la app.
 * @returns Su ficha o `undefined`.
 */
export function nativeAppMeta(id: string): NativeAppMeta | undefined {
  return NATIVE_APPS.find((app) => app.id === id);
}
