/** Tipos compartidos y orden canónico de las secciones de la documentación. */

/** Identificadores de sección: forman las anclas `#docs-<id>` del índice. */
export const docSectionIds = ["que-es", "roles", "personas", "proyectos", "tareas", "calendario", "pizarras", "espacio", "mochila", "mcp", "oauth", "enlaces", "novedades", "problemas", "ayuda"] as const;

/** Identificador de una sección de la documentación. */
export type DocSectionId = (typeof docSectionIds)[number];

/** Tono de una nota: información, consejo o advertencia. */
export type DocNoteTone = "info" | "tip" | "warning";

/** Bloque de contenido: párrafo, pasos ordenados, definiciones, nota, imagen o código. */
export type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "definitions"; items: { term: string; text: string }[] }
  | { type: "note"; tone: DocNoteTone; text: string }
  | { type: "image"; src: string; alt: string; caption: string }
  | { type: "code"; language: string; text: string };

/** Sección de la documentación: entradilla (junto a la ilustración) y cuerpo. */
export type DocSection = {
  id: DocSectionId;
  title: string;
  /** Primer párrafo; se muestra destacado al lado de la ilustración. */
  lead: string;
  blocks: DocBlock[];
};
