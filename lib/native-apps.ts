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
export const AULA_STORE_VERSION = "1.15.0";

export const NATIVE_APP_IDS = ["excalidraw", "calculadora", "tabla-periodica", "blockly", "ajedrez", "tarjetas", "fisica", "geometria", "mapas", "moleculas", "timeline", "hoja-calculo", "aula-documentos"] as const;

export type NativeAppId = (typeof NATIVE_APP_IDS)[number];

/** Alias de ids retirados que se siguen aceptando durante un ciclo. */
export const LEGACY_NATIVE_APP_ALIASES: Readonly<Record<string, NativeAppId>> = {
  "edu-tools": "calculadora",
};

/** Apps documentales antiguas que ya viven dentro de Aula Documentos. */
export const DOCUMENT_SUITE_LEGACY_APP_IDS = [
  "documentos",
  "mermaid",
  "presentaciones",
  "visor-office",
] as const;

/** App canónica de la suite documental. */
export const DOCUMENT_SUITE_CANONICAL_APP_ID = "aula-documentos" as const;

/**
 * Alias de navegación de la suite documental. Se usan para URLs y ventanas,
 * no para leer datos antiguos: los ids heredados siguen existiendo en
 * `app_documents` y en sus herramientas MCP.
 */
export const LEGACY_DOCUMENT_APP_ALIASES: Readonly<Record<string, NativeAppId>> = {
  documentos: "aula-documentos",
  mermaid: "aula-documentos",
  presentaciones: "aula-documentos",
  "visor-office": "aula-documentos",
};

/**
 * Resuelve un id heredado a su app actual sin tocar los ids válidos.
 * @param id - Identificador recibido por URL, MCP o canal en vivo.
 * @returns El id canónico del catálogo o el mismo id si no es un alias.
 */
export function normalizeNativeAppId(id: string): string {
  return LEGACY_NATIVE_APP_ALIASES[id] ?? id;
}

/**
 * Resuelve el id de una URL o ventana a la app que debe abrirse.
 * @param id - Identificador recibido por la URL o el canal en vivo.
 * @returns La app canónica; las apps documentales antiguas abren Aula Documentos.
 */
export function resolveAppRouteId(id: string): string {
  return LEGACY_DOCUMENT_APP_ALIASES[id] ?? normalizeNativeAppId(id);
}

/** Paquete npm y versión exacta que forma parte de una app. */
export type NativeAppPackage = {
  name: string;
  version: string;
};

/** Grupo de capacidades que la ficha de una suite muestra como bloque. */
export type NativeAppSuiteCapability = {
  title: string;
  items: readonly string[];
};

/** Formatos visibles de una suite, separados por apertura y exportación. */
export type NativeAppSuiteFormats = {
  open: readonly string[];
  export: readonly string[];
};

/** App absorbida por una suite; su id se conserva solo para datos y compatibilidad. */
export type NativeAppSuiteMigrationSource = {
  id: string;
  name: string;
};

/** Captura opcional de una suite. */
export type NativeAppSuiteScreenshot = {
  src: string;
  alt: string;
  caption?: string;
};

/** Contrato de producto de una app que reúne varias experiencias. */
export type NativeAppSuite = {
  /** Promesa corta que encabeza tarjeta y ficha. */
  promise: string;
  /** Módulos o experiencias que incluye la suite. */
  modules: readonly string[];
  /** Capacidades agrupadas para la ficha. */
  capabilities: readonly NativeAppSuiteCapability[];
  formats: NativeAppSuiteFormats;
  screenshots?: readonly NativeAppSuiteScreenshot[];
  migration?: {
    replaces: readonly NativeAppSuiteMigrationSource[];
    note: string;
  };
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
  /** Oculta la app del catálogo y del escritorio sin borrar sus datos ni rutas. */
  hidden?: boolean;
  /** Presentación ampliada cuando la app reúne varias experiencias. */
  suite?: NativeAppSuite;
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
  {
    id: "tarjetas",
    name: "Tarjetas de repaso",
    tagline: "Mazos para estudiar con repetición espaciada.",
    description: "Mazos compartidos por proyecto con tarjetas de anverso y reverso, repaso con FSRS y progreso local por navegador.",
    categories: ["Educación"],
    subcategory: "Herramientas",
    cover: "/store/tarjetas.svg",
    features: ["Mazos y tarjetas compartidos por proyecto", "Repaso con FSRS y cuatro valoraciones", "Progreso local por navegador"],
    appVersion: "1.0.0",
    upstream: { name: "ts-fsrs", version: "6.0.0" },
    window: { width: 900, height: 700 },
  },
  {
    id: "fisica",
    name: "Física 2D",
    tagline: "Gravedad, choques, muelles y péndulos en un laboratorio manipulable.",
    description: "Laboratorio de física 2D con escenas de gravedad, colisiones, muelles y péndulos; reproduce, pausa, reinicia y arrastra cuerpos sin red ni servidor.",
    categories: ["Educación"],
    subcategory: "Herramientas",
    cover: "/store/fisica.svg",
    features: ["Cuatro experimentos manipulables", "Reproduce, pausa, reinicia y arrastra cuerpos", "Escena efímera, sin red ni servidor"],
    appVersion: "1.0.0",
    upstream: { name: "matter-js", version: "0.20.0" },
    window: { width: 900, height: 700 },
  },
  {
    id: "geometria",
    name: "Geometría interactiva",
    tagline: "Construcciones y funciones que responden al arrastre.",
    description: "Geometría interactiva con JSXGraph (MIT): puntos, segmentos, rectas, circunferencias, medidas dinámicas y funciones superpuestas; presets y escena efímera sin red ni servidor.",
    categories: ["Educación"],
    subcategory: "Herramientas",
    cover: "/store/geometria.svg",
    features: ["Puntos, segmentos, rectas y circunferencias", "Presets de triángulo, circunferencia y rectas", "Funciones y medidas dinámicas"],
    appVersion: "1.0.0",
    upstream: { name: "jsxgraph", version: "1.14.3" },
    window: { width: 1000, height: 720 },
  },
  {
    id: "mapas",
    name: "Mapas conceptuales",
    tagline: "Nodos y conexiones para ordenar ideas.",
    description: "Mapas conceptuales con React Flow (MIT): nodos y conexiones editables, zoom, paneo, plantillas y guardado por proyecto en app_documents; invitados en solo lectura.",
    categories: ["Educación", "Productividad"],
    subcategory: "Diagramas",
    cover: "/store/mapas.svg",
    features: ["Nodos y conexiones editables", "Plantillas de mapa conceptual y mental", "Guardado por proyecto y modo lectura"],
    appVersion: "1.0.0",
    upstream: { name: "@xyflow/react", version: "12.12.1" },
    window: { width: 1120, height: 720 },
  },
  {
    id: "moleculas",
    name: "Moléculas 3D",
    tagline: "Gira, amplía y explora estructuras moleculares.",
    description: "Moléculas 3D con 3Dmol (BSD-3): visor local con rotación, zoom y etiquetas; biblioteca curada de ocho estructuras con nombre, fórmula y atribución, sin red ni recursos externos.",
    categories: ["Educación"],
    subcategory: "Herramientas",
    cover: "/store/moleculas.svg",
    features: ["Ocho moléculas locales", "Rotación, zoom y etiquetas", "Teclado y ficha con fórmula"],
    appVersion: "1.0.0",
    upstream: { name: "3dmol", version: "2.5.5" },
    window: { width: 1120, height: 720 },
  },
  {
    id: "timeline",
    name: "Líneas de tiempo",
    tagline: "Ordena historias, proyectos y secuencias en el tiempo.",
    description: "Líneas de tiempo con vis-timeline (MIT): eventos, épocas, grupos, zoom y plantillas; guardado por proyecto en app_documents y modo lectura para invitados.",
    categories: ["Educación", "Productividad"],
    subcategory: "Herramientas",
    cover: "/store/timeline.svg",
    features: ["Eventos, épocas y grupos", "Zoom, paneo y plantillas", "Guardado por proyecto y modo lectura"],
    appVersion: "1.0.0",
    upstream: { name: "vis-timeline", version: "8.5.6" },
    window: { width: 1200, height: 720 },
  },
  {
    id: "hoja-calculo",
    name: "Hoja de cálculo",
    tagline: "Organiza datos y guarda tus presupuestos.",
    description: "Hoja de cálculo con jspreadsheet-ce (MIT): celdas editables, formato esencial y exportación CSV protegida, con guardado por proyecto y modo lectura para invitados.",
    categories: ["Oficina", "Productividad"],
    subcategory: "Herramientas",
    cover: "/store/hoja-calculo.svg",
    features: ["Celdas editables y formato esencial", "Exportación CSV local y segura", "Guardado por proyecto y modo lectura"],
    appVersion: "1.0.0",
    upstream: { name: "jspreadsheet-ce", version: "5.0.4" },
    window: { width: 1200, height: 720 },
  },
  {
    id: "aula-documentos",
    name: "Aula Documentos",
    tagline: "La suite documental del aula: texto, imágenes, diagramas, presentaciones y Office.",
    description: "Suite documental con Tiptap, Mermaid y reveal.js (MIT): texto enriquecido, tablas, imágenes locales, diagramas editables, presentaciones, notas del orador y visor de Office; migra los datos de Notas, Diagramas y Presentaciones, importa DOCX/PPTX y exporta HTML, Markdown, DOCX y PPTX. Guardado por proyecto en app_documents y lectura para invitados.",
    categories: ["Oficina", "Productividad"],
    subcategory: "Herramientas",
    cover: "/store/aula-documentos.svg",
    features: ["Notas, imágenes, diagramas y presentaciones en un mismo documento", "Office local con DOCX, XLSX y PPTX sin subir archivos", "Migra datos anteriores y exporta HTML, Markdown, DOCX y PPTX"],
    appVersion: "1.2.0",
    upstream: { name: "@tiptap/core", version: "3.34.0" },
    extras: [
      { name: "@tiptap/react", version: "3.34.0" },
      { name: "@tiptap/pm", version: "3.34.0" },
      { name: "@tiptap/starter-kit", version: "3.34.0" },
      { name: "@tiptap/extension-link", version: "3.34.0" },
      { name: "@tiptap/extension-table", version: "3.34.0" },
      { name: "mermaid", version: "12.3.0" },
      { name: "reveal.js", version: "6.0.2" },
      { name: "docx", version: "9.16.0" },
      { name: "pptxgenjs", version: "4.0.1" },
    ],
    suite: {
      promise: "La suite documental del aula: texto, diagramas, presentaciones y Office en un mismo proyecto.",
      modules: ["Notas", "Diagramas", "Presentaciones", "Office"],
      capabilities: [
        {
          title: "Escritura",
          items: [
            "Texto enriquecido, tablas, enlaces y listas",
            "Plantillas de notas y proyectos",
            "Autosave, conflictos y copias locales",
          ],
        },
        {
          title: "Diagramas",
          items: [
            "Bloques Mermaid con plantillas",
            "Gantt guiado y edición de código",
            "Zoom, pantalla completa y exportación SVG",
          ],
        },
        {
          title: "Presentaciones",
          items: [
            "Diapositivas, temas y notas del orador",
            "Fuente Markdown y plantillas",
            "Modo presentación y exportación HTML",
          ],
        },
        {
          title: "Office e intercambio",
          items: [
            "Visor local de DOCX, XLSX y PPTX",
            "Importación de DOCX/PPTX y Markdown",
            "Exportación DOCX/PPTX, HTML y Markdown",
          ],
        },
      ],
      formats: {
        open: ["DOCX", "XLSX", "PPTX", "Markdown"],
        export: ["HTML", "Markdown", "DOCX", "PPTX"],
      },
      screenshots: [{
        src: "/capturas/aula-documentos-suite.webp",
        alt: "Aula Documentos con un documento de texto, un diagrama y dos diapositivas",
        caption: "Notas, imágenes, diagramas y presentaciones en el mismo documento.",
      }],
      migration: {
        replaces: [
          { id: "documentos", name: "Notas y documentos" },
          { id: "mermaid", name: "Diagramas" },
          { id: "presentaciones", name: "Presentaciones" },
          { id: "visor-office", name: "Visor Office" },
        ],
        note: "Las cuatro apps se integran en Aula Documentos. Usa Importar > Migrar apps antiguas para reunir sus datos con copia reversible.",
      },
    },
    window: { width: 1200, height: 720 },
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
