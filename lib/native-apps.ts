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
export const AULA_STORE_VERSION = "1.1.0";

export const NATIVE_APP_IDS = ["excalidraw", "calculadora", "tabla-periodica", "blockly", "mermaid", "ajedrez"] as const;

export type NativeAppId = (typeof NATIVE_APP_IDS)[number];

/** Alias de ids retirados que se siguen aceptando durante un ciclo. */
export const LEGACY_NATIVE_APP_ALIASES: Readonly<Record<string, NativeAppId>> = {
  "edu-tools": "calculadora",
};

/**
 * Resuelve un id heredado a su app actual sin tocar los ids válidos.
 * @param id - Identificador recibido por URL, MCP o canal en vivo.
 * @returns El id canónico del catálogo o el mismo id si no es un alias.
 */
export function normalizeNativeAppId(id: string): string {
  return LEGACY_NATIVE_APP_ALIASES[id] ?? id;
}

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
  /** Paquete upstream principal y versión instalada; ausente en integración propia. */
  upstream?: NativeAppPackage;
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
    cover: "/store/excalidraw.svg",
    features: ["Lienzo infinito con formas, texto y flechas", "Ideal para esquemas y explicaciones en directo", "Exporta el resultado a imagen"],
    appVersion: "1.0.0",
    upstream: { name: "@excalidraw/excalidraw", version: "0.18.1" },
    window: { width: 880, height: 560 },
  },
  {
    id: "calculadora",
    name: "Calculadora",
    tagline: "Científica, con memoria, historial y ecuaciones por líneas.",
    description: "Calculadora básica y científica con memoria e historial, y ecuaciones por líneas con variables compartidas, con resultado decimal y exacto.",
    categories: ["Educación"],
    subcategory: "Herramientas",
    cover: "/store/calculadora.svg",
    features: ["Básica y científica con memoria e historial", "Ecuaciones por líneas con variables compartidas", "Resultado decimal y exacto"],
    appVersion: "1.0.0",
    upstream: { name: "@cortex-js/compute-engine", version: "0.188.0" },
    window: { width: 1000, height: 720 },
  },
  {
    id: "tabla-periodica",
    name: "Tabla periódica",
    tagline: "Los 118 elementos con ficha, modelo atómico e historia.",
    description: "Tabla periódica en español con búsqueda, filtros por categoría y bloque, ficha del elemento, modelo atómico e historia.",
    categories: ["Educación"],
    subcategory: "Herramientas",
    cover: "/store/tabla-periodica.svg",
    features: ["Los 118 elementos con búsqueda y filtros", "Ficha, descripción e historia de cada elemento", "Modelo atómico animado"],
    appVersion: "1.0.0",
    window: { width: 1120, height: 760 },
  },
  {
    id: "blockly",
    name: "Programación por bloques",
    tagline: "Programa con bloques y obtén código JavaScript o Python.",
    description: "Editor de bloques tipo Scratch con Blockly (Apache-2.0): lógica, bucles, matemáticas y texto, guardado por proyecto y código generado en JavaScript y Python.",
    categories: ["Productividad"],
    subcategory: "Programación",
    cover: "/store/blockly.svg",
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
    cover: "/store/mermaid.svg",
    features: ["Flujos, secuencia, Gantt, clases y estados", "Plantillas listas y vista previa en vivo", "Guardado por proyecto y exportación SVG"],
    appVersion: "1.0.0",
    upstream: { name: "mermaid", version: "12.3.0" },
    window: { width: 1120, height: 720 },
  },
  {
    id: "ajedrez",
    name: "Ajedrez",
    tagline: "Dos jugadores o un rival aleatorio en el mismo tablero.",
    description: "Ajedrez local para dos jugadores o contra un rival aleatorio, con reglas completas, historial y movimientos por clic, arrastre o teclado.",
    categories: ["Educación", "Productividad"],
    subcategory: "Herramientas",
    cover: "/store/ajedrez.svg",
    features: ["Dos jugadores locales o rival aleatorio", "Reglas completas: jaque, mate, tablas y coronación", "Movimientos por clic, arrastre o teclado"],
    appVersion: "1.0.0",
    upstream: { name: "chess.js", version: "1.4.0" },
    extras: [{ name: "react-chessboard", version: "5.12.1" }],
    window: { width: 900, height: 700 },
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
