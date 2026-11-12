/**
 * Bloque de contenido de la documentación: párrafo, lista de pasos o nota.
 */
export type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "note"; text: string };

/**
 * Sección de la documentación con identificador para el índice y bloques.
 */
export type DocSection = {
  id: string;
  title: string;
  blocks: DocBlock[];
};

/**
 * Contenido de la documentación general de Aula Kanban.
 * Se edita aquí: la vista lo renderiza en orden con su índice de anclas.
 * Las secciones por rol y las guías de VPS se irán añadiendo en iteraciones futuras.
 */
export const docSections: DocSection[] = [
  {
    id: "que-es",
    title: "Qué es Aula Kanban",
    blocks: [
      { type: "paragraph", text: "Aula Kanban es el tablero colaborativo del grupo de clase: organiza el trabajo del proyecto en tareas, sigue el avance de cada una y comparte pizarras y aplicaciones útiles con todo el grupo." },
      { type: "paragraph", text: "Cada proyecto es un tablero independiente. Las tareas, los alumnos, los profesores y las aplicaciones de Mi espacio pertenecen a ese proyecto: si cambias de proyecto en el selector de la cabecera, cambias de tablero." },
    ],
  },
  {
    id: "roles",
    title: "Roles y permisos",
    blocks: [
      { type: "paragraph", text: "Tu rol en el proyecto define lo que puedes hacer. Si no ves una acción, suele ser porque tu rol no la incluye." },
      {
        type: "steps",
        items: [
          "Propietario o administrador: gestiona el proyecto, los miembros y los ajustes de la cuenta.",
          "Profesor: crea y edita cualquier tarea, y gestiona alumnos y profesores.",
          "Alumno: edita sus propias tareas, puede reclamar tareas sin responsable y mueve sus tarjetas entre columnas.",
          "Invitado: consulta el tablero y las pizarras, sin crear ni editar nada.",
        ],
      },
      { type: "note", text: "Los invitados entran con un enlace de invitación. Si tu enlace no funciona, comprueba que has iniciado sesión con la cuenta invitada o pide una invitación nueva a quien gestiona el proyecto." },
    ],
  },
  {
    id: "tareas",
    title: "Trabajar con tareas",
    blocks: [
      { type: "paragraph", text: "Las tareas viven en cuatro columnas según su estado: Por hacer, En curso, En revisión y Hecho. El panel de progreso del tablero muestra el porcentaje de tareas hechas del grupo." },
      {
        type: "steps",
        items: [
          "Crea una tarea con «Nueva tarea» o con el botón «Añadir tarea» de una columna.",
          "Arrastra una tarjeta por su asa hasta otra columna para cambiar su estado, o edita la tarea desde su tarjeta. Con el teclado: Tab hasta el asa, Espacio para levantar, flechas para mover y Espacio para soltar.",
          "Asigna responsables (alumnos o profesores) a cada tarea; una tarea sin asignar puede reclamarla cualquier alumno.",
          "Filtra por prioridad o por alumno y busca por título o descripción para encontrar tareas rápido.",
        ],
      },
      { type: "note", text: "Al editar una tarea puedes cambiar su título, descripción, prioridad, responsables, fecha y estado. Los cambios se comparten con todo el grupo al instante." },
    ],
  },
  {
    id: "pizarras",
    title: "Pizarras de las tareas",
    blocks: [
      { type: "paragraph", text: "Cada tarea tiene su propia pizarra de dibujo integrada (Excalidraw): ideal para esquemas, mapas, bocetos o anotaciones del trabajo." },
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
    blocks: [
      { type: "paragraph", text: "«Mi espacio» es el escritorio del proyecto: desde ahí se abren las aplicaciones del grupo en ventanas. Las aplicaciones nativas ya vienen instaladas; las aplicaciones de VPS (AFFiNE, n8n y otras) se instalan desde Aula Store cuando el gestor del VPS está conectado." },
      {
        type: "steps",
        items: [
          "Abre «Mi espacio» desde la navegación de la cabecera.",
          "Haz clic en un icono para abrir la aplicación en una ventana; puedes arrastrar la ventana, minimizarla o cambiar su tamaño.",
          "Abre Aula Store para ver el catálogo e instalar o desinstalar aplicaciones.",
        ],
      },
      { type: "note", text: "Si el gestor del VPS no está conectado, Mi espacio está incompleto: mientras tanto solo están disponibles las aplicaciones nativas." },
    ],
  },
  {
    id: "ayuda",
    title: "Pedir ayuda",
    blocks: [
      { type: "paragraph", text: "Aula Kanban se mejora con ayuda de inteligencia artificial, y tú también puedes pedir ayuda directamente." },
      {
        type: "steps",
        items: [
          "Para dudas de uso o ideas, pregunta a ChatGPT desde el chat que tienes abierto.",
          "Para cambios en el propio Aula Kanban (funciones, textos, correcciones), el canal es Codex: quien gestiona el proyecto puede pedir el cambio allí.",
          "Nunca pegues contraseñas ni tokens en el chat: si una función pide credenciales, configúralas en el panel de Sites.",
        ],
      },
    ],
  },
];
