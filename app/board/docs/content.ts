/**
 * Contenido de la documentación de Aula Kanban: solo datos, sin presentación.
 * Los iconos y las ilustraciones de cada sección viven en `section-visuals.ts`,
 * así este archivo se puede editar sin tocar componentes.
 */

/** Identificadores de sección: forman las anclas `#docs-<id>` del índice. */
export const docSectionIds = ["que-es", "roles", "tareas", "pizarras", "espacio", "mcp", "ayuda"] as const;

/** Identificador de una sección de la documentación. */
export type DocSectionId = (typeof docSectionIds)[number];

/** Tono de una nota: información, consejo o advertencia. */
export type DocNoteTone = "info" | "tip" | "warning";

/** Bloque de contenido: párrafo, pasos ordenados, definiciones, nota o código. */
export type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "definitions"; items: { term: string; text: string }[] }
  | { type: "note"; tone: DocNoteTone; text: string }
  | { type: "code"; language: string; text: string };

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
  back: "Volver a Clase",
  indexLabel: "Secciones de la documentación",
  indexTitle: "En esta página",
} as const;

/**
 * Secciones en el orden en que se muestran.
 * Las secciones por rol se añadirán en iteraciones futuras.
 */
export const docSections: DocSection[] = [
  {
    id: "que-es",
    title: "Qué es Aula Kanban",
    lead: "Aula Kanban es el tablero colaborativo del grupo de clase: organiza el trabajo del proyecto en tareas, sigue el avance de cada una y comparte pizarras y aplicaciones útiles con todo el grupo.",
    blocks: [
      { type: "paragraph", text: "Cada proyecto es un tablero independiente. Las tareas, los alumnos, los profesores y las aplicaciones de Mi espacio pertenecen a ese proyecto: si cambias de proyecto en el selector de la cabecera, cambias de tablero." },
      { type: "paragraph", text: "La cabecera separa el trabajo en Clase, Alumnos, Profesores y Documentación. Mi espacio se abre desde el icono de aplicaciones, junto a las vistas principales. El engranaje abre los ajustes generales, con Cuenta y Administradores." },
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
          { term: "Propietario o administrador", text: "Gestiona el proyecto, los miembros y los ajustes generales." },
          { term: "Profesor", text: "Crea y edita tareas, gestiona alumnos y puede editar su propia ficha de profesor." },
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
    lead: "Dentro de Clase, la sección Tareas reúne las cuatro columnas según su estado: Por hacer, En curso, En revisión y Hecho. El panel de progreso del tablero muestra el porcentaje de tareas hechas del grupo.",
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
    lead: "«Mi espacio» es el escritorio del proyecto: desde ahí se abren las aplicaciones del grupo en ventanas. Las aplicaciones nativas se pueden instalar desde Aula Store para usarlas en el proyecto.",
    blocks: [
      {
        type: "steps",
        items: [
          "Abre «Mi espacio» desde el icono de la cabecera.",
          "Haz clic en un icono para abrir la aplicación en una ventana; puedes arrastrar la ventana, minimizarla o cambiar su tamaño.",
          "Abre Aula Store para ver el catálogo e instalar o desinstalar aplicaciones.",
        ],
      },
    ],
  },
  {
    id: "mcp",
    title: "Servidor MCP",
    lead: "Aula Kanban también escucha a herramientas de inteligencia artificial (Claude, ChatGPT y otros clientes compatibles con MCP) gracias a un servidor remoto alojado en el propio Site. Tu asistente ve y mueve el mismo tablero que tú.",
    blocks: [
      { type: "paragraph", text: "El servidor vive en `/api/mcp` de este Site y se autentica con un token personal, no con tu sesión de ChatGPT. Cada token obedece los permisos de tu rol en el proyecto: las cuentas invitadas solo pueden consultar, y un alumno solo puede crear o editar sus propias tareas, igual que en la web." },
      {
        type: "steps",
        items: [
          "Abre Ajustes > Cuenta y, en «Tokens del MCP», crea un token con la etiqueta del cliente que vayas a usar (por ejemplo, «Claude» o «ChatGPT»).",
          "Copia el token en ese momento: solo se muestra una vez y no se puede recuperar.",
          "En el cliente MCP, introduce la URL del Site y el token como cabecera `Authorization: Bearer …`, como en el bloque de abajo.",
          "Prueba `listar_proyectos` y `listar_tareas`: si el cliente responde, la conexión está lista; si devuelve 401, el token falta o ha sido revocado.",
        ],
      },
      {
        type: "code",
        language: "json",
        text: [
          "{",
          '  "mcpServers": {',
          '    "aula-kanban": {',
          '      "url": "https://TU-SITE/api/mcp",',
          '      "headers": { "Authorization": "Bearer TU-TOKEN" }',
          "    }",
          "  }",
          "}",
        ].join("\n"),
      },
      { type: "note", tone: "warning", text: "El token es como una contraseña: quien lo tenga actúa con tus permisos en el proyecto. Revócalo en Ajustes > Cuenta en cuanto dejes de usarlo y nunca lo pegues en un chat." },
      { type: "note", tone: "info", text: "Algunos clientes clásicos solo hablan con procesos locales (stdio). Esos necesitan un puente que reenvíe la URL remota con la cabecera de autorización; los clientes modernos con soporte HTTP remoto se conectan directamente. En cada peticion cada token tiene un límite básico de 120 peticiones por minuto." },
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
