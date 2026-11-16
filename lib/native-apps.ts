/**
 * Catálogo compartido de aplicaciones nativas. Es data pura (sin React) para
 * poder importarlo desde el servidor (API) y desde la interfaz.
 *
 * Taxonomía (STORE-03A): categorías principales por familia de uso
 * (Educación, Oficina, Productividad) con multi-categoría por app, y
 * subcategorías de vocabulario compartido (la misma subcategoría existe
 * dentro de todas las categorías principales de la app).
 */

/** Categorías principales de Aula Store, por familia de uso. */
export type StoreTopCategory = "Educación" | "Oficina" | "Productividad";

export const STORE_TOP_CATEGORIES: readonly StoreTopCategory[] = ["Educación", "Oficina", "Productividad"];

/** Subcategorías de Aula Store; vocabulario cerrado y compartido. */
export type SubCategory = "Pizarras" | "Diagramas" | "Programación" | "Herramientas";

export const STORE_SUBCATEGORIES: readonly SubCategory[] = ["Pizarras", "Diagramas", "Programación", "Herramientas"];

/** Alias heredado: la categoría principal de una app. */
export type NativeCategory = StoreTopCategory;

/** Categorías principales de la Tienda (filtros y secciones). */
export const STORE_CATEGORIES: NativeCategory[] = ["Educación", "Oficina", "Productividad"];

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
  /** Categorías principales a las que pertenece (≥1). */
  categories: readonly StoreTopCategory[];
  /** Subcategoría compartida; la misma en todas sus categorías. */
  subcategory: SubCategory;
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
  /** Tamaño inicial de la ventana en Tienda. */
  window: { width: number; height: number };
};

export const NATIVE_APPS: readonly NativeAppMeta[] = [
  {
    id: "excalidraw",
    name: "Excalidraw",
    tagline: "Pizarra colaborativa para dibujar, explicar y anotar.",
    description: "Pizarra del espacio de trabajo con Excalidraw (MIT): dibuja y colabora en directo.",
    categories: ["Educación"],
    subcategory: "Pizarras",
    cover: "/store/excalidraw.png",
    features: ["Lienzo infinito con formas, texto y flechas", "Ideal para esquemas y explicaciones en directo", "Exporta el resultado a imagen"],
    appVersion: "1.0.0",
    upstream: { name: "@excalidraw/excalidraw", version: "0.18.1" },
    window: { width: 880, height: 560 },
  },
  {
    id: "edu-tools",
    name: "Herramientas de aula",
    tagline: "Calculadora científica con ecuaciones y tabla periódica.",
    description: "Calculadora con pantalla, modo científico, memoria e historial; ecuaciones por líneas con variables compartidas y tabla periódica en español.",
    categories: ["Educación"],
    subcategory: "Herramientas",
    cover: "/store/edu-tools.png",
    features: ["Calculadora básica y científica con memoria e historial", "Ecuaciones por líneas con variables compartidas", "Tabla periódica con ficha, modelo atómico e historia"],
    appVersion: "1.0.0",
    upstream: { name: "@cortex-js/compute-engine", version: "0.188.0" },
    window: { width: 1120, height: 760 },
  },
  {
    id: "blockly",
    name: "Programación por bloques",
    tagline: "Programa con bloques y obtén código JavaScript o Python.",
    description: "Editor de bloques tipo Scratch con Blockly (Apache-2.0): lógica, bucles, matemáticas y texto, guardado por proyecto y código generado en JavaScript y Python.",
    categories: ["Productividad"],
    subcategory: "Programación",
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
    categories: ["Educación", "Productividad"],
    subcategory: "Diagramas",
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
