/**
 * Catálogo curado de libros escolares descargables (STORE-02). Es data
 * pura (sin React) para poder importarlo desde el servidor (ingesta y
 * ruta de libros) y desde la interfaz (vista Libros).
 *
 * Cada libro se persiste en R2 con su procedencia (fuente, URL original,
 * licencia y atribución) para poder redistribuirlo legalmente y
 * actualizarlo cuando la fuente publique una versión nueva. Ningún
 * título entra sin licencia verificada: los libros comerciales con
 * copyright no se incluyen.
 *
 * Cobertura inicial: Matemáticas de Marea Verde (CC BY-NC-SA), ESO y
 * Bachillerato. Primaria e INTEF/EDIA (HTML/SCORM) quedan para fases
 * posteriores.
 */

/** Niveles educativos del catálogo de libros. */
export type BookLevel = "ESO" | "Bachillerato";

/** Niveles en el orden de las secciones de la vista Libros. */
export const BOOK_LEVELS: readonly BookLevel[] = ["ESO", "Bachillerato"];

/** Fuente de un libro: autoría y URL original. */
export type BookSource = {
  /** Editorial o proyecto autor, tal como debe atribuirse. */
  name: string;
  /** URL pública original del archivo. */
  url: string;
};

/** Ficha de un libro del catálogo. */
export type BookMeta = {
  /** Identificador estable en el catálogo. */
  id: string;
  /** Título visible. */
  title: string;
  /** Nivel educativo. */
  level: BookLevel;
  /** Curso dentro del nivel (p. ej. «1º», «4ºA», «2º»). */
  course: string;
  /** Materia. */
  subject: string;
  /** Etiqueta breve para la tarjeta. */
  tagline: string;
  /** Descripción para la ficha. */
  description: string;
  /** Fuente y procedencia. */
  source: BookSource;
  /** Licencia del libro (texto legible y código CC). */
  license: string;
  /** Autoría tal como debe atribuirse. */
  attribution: string;
  /** Formato del archivo persistido. */
  format: "pdf";
  /** Tamaño del archivo en bytes, para el presupuesto y la ficha. */
  sizeBytes: number;
  /** Versión o fecha de la copia persistida; `null` hasta la ingesta. */
  version: string | null;
  /** Clave del archivo en R2; `null` hasta la ingesta (Fase 2). */
  storageKey: string | null;
};

const MAREA_VERDE: BookSource = {
  name: "Textos Marea Verde",
  url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/",
};

const LICENSE = "Reconocimiento-NoComercial-CompartirIgual (CC BY-NC-SA 3.0)";
const ATTRIBUTION = "Textos Marea Verde (apuntesmareaverde.org.es)";

export const BOOKS: readonly BookMeta[] = [
  {
    id: "eso-matematicas-1",
    title: "Matemáticas 1º ESO",
    level: "ESO",
    course: "1º",
    subject: "Matemáticas",
    tagline: "Libro completo LOMLOE de Matemáticas de 1º de ESO.",
    description: "Libro completo de Matemáticas de 1º de ESO (LOMLOE) de Textos Marea Verde: resolución de problemas, números naturales y divisibilidad, fracciones, decimales y más.",
    source: { ...MAREA_VERDE, url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/1ESO/1ESO.pdf" },
    license: LICENSE,
    attribution: ATTRIBUTION,
    format: "pdf",
    sizeBytes: 12094989,
    version: null,
    storageKey: null,
  },
  {
    id: "eso-matematicas-2",
    title: "Matemáticas 2º ESO",
    level: "ESO",
    course: "2º",
    subject: "Matemáticas",
    tagline: "Libro completo LOMLOE de Matemáticas de 2º de ESO.",
    description: "Libro completo de Matemáticas de 2º de ESO (LOMLOE) de Textos Marea Verde: números, potencias y raíces, ecuaciones y geometría.",
    source: { ...MAREA_VERDE, url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/2ESO/2ESO.pdf" },
    license: LICENSE,
    attribution: ATTRIBUTION,
    format: "pdf",
    sizeBytes: 11552118,
    version: null,
    storageKey: null,
  },
  {
    id: "eso-matematicas-3",
    title: "Matemáticas 3º ESO",
    level: "ESO",
    course: "3º",
    subject: "Matemáticas",
    tagline: "Libro completo LOMLOE de Matemáticas de 3º de ESO.",
    description: "Libro completo de Matemáticas de 3º de ESO (LOMLOE) de Textos Marea Verde: racionales, potencias, sucesiones, polinomios y ecuaciones.",
    source: { ...MAREA_VERDE, url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/3ESO/Tercero.pdf" },
    license: LICENSE,
    attribution: ATTRIBUTION,
    format: "pdf",
    sizeBytes: 17699845,
    version: null,
    storageKey: null,
  },
  {
    id: "eso-matematicas-4a",
    title: "Matemáticas 4º ESO (aplicadas)",
    level: "ESO",
    course: "4ºA",
    subject: "Matemáticas",
    tagline: "Libro completo de Matemáticas orientadas a las enseñanzas aplicadas.",
    description: "Libro completo de Matemáticas de 4º ESO, itinerario de enseñanzas aplicadas (LOMLOE), de Textos Marea Verde.",
    source: { ...MAREA_VERDE, url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/4A/CuartoA.pdf" },
    license: LICENSE,
    attribution: ATTRIBUTION,
    format: "pdf",
    sizeBytes: 11176947,
    version: null,
    storageKey: null,
  },
  {
    id: "eso-matematicas-4b",
    title: "Matemáticas 4º ESO (académicas)",
    level: "ESO",
    course: "4ºB",
    subject: "Matemáticas",
    tagline: "Libro completo de Matemáticas orientadas a las enseñanzas académicas.",
    description: "Libro completo de Matemáticas de 4º ESO, itinerario de enseñanzas académicas (LOMLOE), de Textos Marea Verde. Es el libro más pesado del catálogo (32 MB): se valora servirlo por capítulos en una fase posterior.",
    source: { ...MAREA_VERDE, url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/4B/CuartoB.pdf" },
    license: LICENSE,
    attribution: ATTRIBUTION,
    format: "pdf",
    sizeBytes: 32582859,
    version: null,
    storageKey: null,
  },
  {
    id: "bach-matematicas-1",
    title: "Matemáticas I · 1º Bachillerato",
    level: "Bachillerato",
    course: "1º",
    subject: "Matemáticas",
    tagline: "Libro completo LOMLOE de Matemáticas I (Bachillerato de Ciencias).",
    description: "Libro completo de Matemáticas I de 1º de Bachillerato (Bachillerato de Ciencias, LOMLOE) de Textos Marea Verde: álgebra, sucesiones, trigonometría y probabilidad.",
    source: { ...MAREA_VERDE, url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/Bachillerato/Matematicas_I.pdf" },
    license: LICENSE,
    attribution: ATTRIBUTION,
    format: "pdf",
    sizeBytes: 15335470,
    version: null,
    storageKey: null,
  },
  {
    id: "bach-matematicas-2",
    title: "Matemáticas II · 2º Bachillerato",
    level: "Bachillerato",
    course: "2º",
    subject: "Matemáticas",
    tagline: "Libro completo LOMLOE de Matemáticas II (Bachillerato de Ciencias).",
    description: "Libro completo de Matemáticas II de 2º de Bachillerato (Bachillerato de Ciencias, LOMLOE) de Textos Marea Verde: matrices, sistemas, continuidad y derivadas.",
    source: { ...MAREA_VERDE, url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/Bachillerato/Matematicas%20II.pdf" },
    license: LICENSE,
    attribution: ATTRIBUTION,
    format: "pdf",
    sizeBytes: 13244574,
    version: null,
    storageKey: null,
  },
  {
    id: "bach-sociales-1",
    title: "Matemáticas aplicadas a CCSS I · 1º Bachillerato",
    level: "Bachillerato",
    course: "1º",
    subject: "Matemáticas aplicadas a las Ciencias Sociales",
    tagline: "Libro completo LOMLOE de Matemáticas aplicadas a las Ciencias Sociales I.",
    description: "Libro completo de Matemáticas aplicadas a las Ciencias Sociales I de 1º de Bachillerato (LOMLOE) de Textos Marea Verde.",
    source: { ...MAREA_VERDE, url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/Bachillerato/Sociales%20I.pdf" },
    license: LICENSE,
    attribution: ATTRIBUTION,
    format: "pdf",
    sizeBytes: 11160616,
    version: null,
    storageKey: null,
  },
  {
    id: "bach-sociales-2",
    title: "Matemáticas aplicadas a CCSS II · 2º Bachillerato",
    level: "Bachillerato",
    course: "2º",
    subject: "Matemáticas aplicadas a las Ciencias Sociales",
    tagline: "Libro completo LOMLOE de Matemáticas aplicadas a las Ciencias Sociales II.",
    description: "Libro completo de Matemáticas aplicadas a las Ciencias Sociales II de 2º de Bachillerato (LOMLOE) de Textos Marea Verde: matrices, determinantes, sistemas y probabilidad.",
    source: { ...MAREA_VERDE, url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/Bachillerato/Sociales%20II.pdf" },
    license: LICENSE,
    attribution: ATTRIBUTION,
    format: "pdf",
    sizeBytes: 8682942,
    version: null,
    storageKey: null,
  },
  {
    id: "bach-generales",
    title: "Matemáticas Generales · 1º Bachillerato",
    level: "Bachillerato",
    course: "1º",
    subject: "Matemáticas Generales",
    tagline: "Libro completo LOMLOE de Matemáticas Generales (Bachillerato General).",
    description: "Libro completo de Matemáticas Generales de 1º de Bachillerato (Bachillerato General, LOMLOE) de Textos Marea Verde.",
    source: { ...MAREA_VERDE, url: "https://apuntesmareaverde.org.es/grupos/mat/LOMLOE/Bachillerato/Matematicas%20Generales.pdf" },
    license: LICENSE,
    attribution: ATTRIBUTION,
    format: "pdf",
    sizeBytes: 13800639,
    version: null,
    storageKey: null,
  },
];

/**
 * Busca la ficha de un libro del catálogo.
 * @param id - Identificador del libro.
 * @returns Su ficha o `undefined`.
 */
export function bookById(id: string): BookMeta | undefined {
  return BOOKS.find((book) => book.id === id);
}

/**
 * Libros de un nivel, en el orden del catálogo.
 * @param level - Nivel educativo.
 * @returns Las fichas de ese nivel.
 */
export function booksByLevel(level: BookLevel): BookMeta[] {
  return BOOKS.filter((book) => book.level === level);
}
