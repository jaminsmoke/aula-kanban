/**
 * Contenido de la documentación de Aula Kanban: solo datos, sin presentación.
 * Los iconos y las ilustraciones de cada sección viven en `section-visuals.ts`,
 * así este archivo se puede editar sin tocar componentes.
 */

/** Identificadores de sección: forman las anclas `#docs-<id>` del índice. */
export const docSectionIds = ["que-es", "roles", "tareas", "pizarras", "espacio", "ayuda"] as const;

/** Identificador de una sección de la documentación. */
export type DocSectionId = (typeof docSectionIds)[number];

/** Tono de una nota: información, consejo o advertencia. */
export type DocNoteTone = "info" | "tip" | "warning";

/** Bloque de contenido: párrafo, pasos ordenados, definiciones o nota. */
export type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "definitions"; items: { term: string; text: string }[] }
  | { type: "note"; tone: DocNoteTone; text: string };

/** Sección de la documentación: entradilla (junto a la ilustración) y cuerpo. */
export type DocSection = {
  id: DocSectionId;
  title: string;
  /** Primer párrafo; se muestra destacado al lado de la ilustración. */
  lead: string;
  blocks: DocBlock[];
};

/** Título, entradilla y textos del héroe de la página. */
export const docsHero = {
  eyebrow: "Documentación",
  title: "Documentación de",
  titleAccent: "Aula Kanban",
  intro: "Cómo funciona el tablero, qué puede hacer cada rol y dónde están las herramientas del grupo.",
  back: "Volver a Kanban",
  indexLabel: "Secciones de la documentación",
  indexTitle: "En esta página",
} as const;

/**
 * Secciones en el orden en que se muestran.
 * Las secciones por rol y las guías de VPS se añadirán en iteraciones futuras.
 */
export const docSections: DocSection[] = [
  {
    id: "que-es",
    title: "Qué es Aula Kanban",
    lead: "Aula Kanban es el tablero colaborativo del grupo de clase: organiza el trabajo del proyecto en tareas, sigue el avance de cada una y comparte pizarras y aplicaciones útiles con todo el grupo.",
    blocks: [
      { type: "paragraph", text: "Cada proyecto es un tablero independiente. Las tareas, los alumnos, los profesores y las aplicaciones de Mi espacio pertenecen a ese proyecto: si cambias de proyecto en el selector de la cabecera, cambias de tablero." },
    ],
  },
  {
    id: "roles",
    title: "Roles y permisos",
    lead: "Tu rol en el proyecto define lo que puedes hacer. Si no ves una acción, suele ser porque tu rol no la incluye.",
    blocks: [
      {
        type: "definitions",
        items: [
          { term: "Propietario o administrador", text: "Gestiona el proyecto, los miembros y los ajustes de la cuenta." },
          { term: "Profesor", text: "Crea y edita cualquier tarea, y gestiona alumnos y profesores." },
          { term: "Alumno", text: "Edita sus propias tareas, puede reclamar tareas sin responsable y mueve sus tarjetas entre columnas." },
          { term: "Invitado", text: "Consulta el tablero y las pizarras, sin crear ni editar nada." },
        ],
      },
      { type: "note", tone: "info", text: "Los invitados entran con un enlace de invitación. Si tu enlace no funciona, comprueba que has iniciado sesión con la cuenta invitada o pide una invitación nueva a quien gestiona el proyecto." },
    ],
  },
  {
    id: "tareas",
    title: "Trabajar con tareas",
    lead: "Las tareas viven en cuatro columnas según su estado: Por hacer, En curso, En revisión y Hecho. El panel de progreso del tablero muestra el porcentaje de tareas hechas del grupo.",
    blocks: [
      {
        type: "steps",
        items: [
          "Crea una tarea con «Nueva tarea» o con el botón «Añadir tarea» de una columna.",
          "Arrastra una tarjeta por su asa hasta otra columna para cambiar su estado, o edita la tarea desde su tarjeta.",
          "Asigna responsables (alumnos o profesores) a cada tarea; una tarea sin asignar puede reclamarla cualquier alumno.",
          "Filtra por prioridad o por alumno y busca por título o descripción para encontrar tareas rápido.",
        ],
      },
      { type: "note", tone: "tip", text: "Con el teclado: Tab hasta el asa de la tarjeta, Espacio para levantarla, flechas para moverla y Espacio para soltarla." },
      { type: "note", tone: "info", text: "Al editar una tarea puedes cambiar su título, descripción, prioridad, responsables, fecha y estado. Los cambios se comparten con todo el grupo al instante." },
    ],
  },
  {
    id: "pizarras",
    title: "Pizarras de las tareas",
    lead: "Cada tarea tiene su propia pizarra de dibujo integrada (Excalidraw): ideal para esquemas, mapas, bocetos o anotaciones del trabajo.",
    blocks: [
      {
        type: "steps",
        items: [
          "Abre la tarea y usa la pizarra para dibujar o anotar.",
          "Las pizarras se guardan con la tarea y las ve todo el grupo.",
        ],
      },
    ],
  },
  {
    id: "espacio",
    title: "Mi espacio y las aplicaciones",
    lead: "«Mi espacio» es el escritorio del proyecto: desde ahí se abren las aplicaciones del grupo en ventanas. Las aplicaciones nativas ya vienen instaladas; las aplicaciones de VPS (AFFiNE, n8n y otras) se instalan desde Aula Store cuando el gestor del VPS está conectado.",
    blocks: [
      {
        type: "steps",
        items: [
          "Abre «Mi espacio» desde la navegación de la cabecera.",
          "Haz clic en un icono para abrir la aplicación en una ventana; puedes arrastrar la ventana, minimizarla o cambiar su tamaño.",
          "Abre Aula Store para ver el catálogo e instalar o desinstalar aplicaciones.",
        ],
      },
      { type: "note", tone: "info", text: "Mientras el gestor del VPS no esté conectado, en Mi espacio solo estarán disponibles las aplicaciones nativas." },
    ],
  },
  {
    id: "ayuda",
    title: "Pedir ayuda",
    lead: "Aula Kanban se mejora con ayuda de la inteligencia artificial, y tú también puedes pedir ayuda directamente.",
    blocks: [
      {
        type: "steps",
        items: [
          "Para dudas de uso o ideas, pregunta a ChatGPT desde el chat que tienes abierto.",
          "Para cambios en el propio Aula Kanban (funciones, textos, correcciones), el canal es Codex: quien gestiona el proyecto puede pedir el cambio allí.",
        ],
      },
      { type: "note", tone: "warning", text: "Nunca pegues contraseñas ni tokens en el chat: si una función pide credenciales, configúralas en el panel de Sites." },
    ],
  },
];

/**
 * Ancla HTML de una sección.
 * @param id - Identificador de la sección.
 * @returns El id del elemento, p. ej. `docs-roles`.
 */
export function docAnchor(id: DocSectionId): string {
  return `docs-${id}`;
}
