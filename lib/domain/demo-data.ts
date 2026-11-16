import { DEMO_PROJECT_ID, DEMO_PROJECT_NAME } from "./demo.ts";

/** Alumno ficticio del proyecto de demostración. */
export type DemoStudent = {
  section: string;
  name: string;
  displayName: string;
  role: string;
  activities: string;
  aiHelp: string;
};

/** Profesor ficticio del proyecto de demostración. */
export type DemoTeacher = {
  id: string;
  name: string;
  displayName: string;
  role: string;
  activities: string;
  aiHelp: string;
};

/** Responsable de una tarea de la demo. */
export type DemoAssignee = { kind: "student" | "teacher"; profileId: string };

/** Tarea ficticia con id fijo para poder sembrarla también por SQL. */
export type DemoTask = {
  id: string;
  title: string;
  description: string;
  dueDay: number;
  priority: "low" | "normal" | "high";
  status: "pending" | "active" | "review" | "done";
  assignees: DemoAssignee[];
};

export { DEMO_PROJECT_ID, DEMO_PROJECT_NAME };

export const DEMO_STUDENTS: DemoStudent[] = [
  {
    section: "2f1c9b1e-0002-4a00-8000-000000000001",
    name: "Ada Lovelace",
    displayName: "Ada Lovelace",
    role: "Delegada",
    activities: "Coordina el grupo y revisa el tablero cada mañana.",
    aiHelp: "Pide ejemplos de algoritmos y comprueba los pasos con la IA.",
  },
  {
    section: "2f1c9b1e-0002-4a00-8000-000000000002",
    name: "Grace Hopper",
    displayName: "Grace Hopper",
    role: "Materiales",
    activities: "Prepara los materiales de los experimentos y cuida el laboratorio.",
    aiHelp: "Consulta a la IA cómo explicar un experimento con palabras sencillas.",
  },
  {
    section: "2f1c9b1e-0002-4a00-8000-000000000003",
    name: "Alan Turing",
    displayName: "Alan Turing",
    role: "Portavoz",
    activities: "Presenta las conclusiones del equipo en la puesta en común.",
    aiHelp: "Usa la IA para ordenar las ideas antes de exponerlas.",
  },
  {
    section: "2f1c9b1e-0002-4a00-8000-000000000004",
    name: "Emmy Noether",
    displayName: "Emmy Noether",
    role: "Diseño",
    activities: "Cuida la maqueta, los murales y la presentación visual.",
    aiHelp: "Pide a la IA propuestas de distribución para el mural.",
  },
  {
    section: "2f1c9b1e-0002-4a00-8000-000000000005",
    name: "Katherine Johnson",
    displayName: "Katherine Johnson",
    role: "Datos",
    activities: "Anota las medidas y los resultados de cada práctica.",
    aiHelp: "Comprueba con la IA las tablas y los cálculos del informe.",
  },
  {
    section: "2f1c9b1e-0002-4a00-8000-000000000006",
    name: "Hedy Lamarr",
    displayName: "Hedy Lamarr",
    role: "Documentación",
    activities: "Guarda las fuentes y redacta el diario del proyecto.",
    aiHelp: "Pide a la IA un resumen de las fuentes antes de citarlas.",
  },
];

export const DEMO_TEACHERS: DemoTeacher[] = [
  {
    id: "3f1c9b1e-0002-4a00-8000-000000000101",
    name: "Marie Curie",
    displayName: "Marie Curie",
    role: "Profesora de Ciencias",
    activities: "Prepara las prácticas de laboratorio y revisa los informes.",
    aiHelp: "Contrasta con la IA las explicaciones antes de llevarlas al aula.",
  },
  {
    id: "3f1c9b1e-0002-4a00-8000-000000000102",
    name: "Rosalind Franklin",
    displayName: "Rosalind Franklin",
    role: "Profesora de Lengua",
    activities: "Acompaña las fichas de lectura y el diario del proyecto.",
    aiHelp: "Usa la IA para preparar preguntas de comprensión.",
  },
];

/**
 * Tareas canónicas del proyecto. El título sigue siendo la clave estable
 * para la API local; el id fijo permite sembrarlas por SQL sin duplicarlas.
 */
export const DEMO_TASKS: DemoTask[] = [
  {
    id: "4f1c9b1e-0002-4a00-8000-000000000001",
    title: "Ficha de lectura",
    description: "Leer el capítulo acordado y completar la ficha con una frase que resuma la idea principal.",
    dueDay: 16,
    priority: "low",
    status: "done",
    assignees: [
      { kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000002" },
      { kind: "teacher", profileId: "3f1c9b1e-0002-4a00-8000-000000000102" },
    ],
  },
  {
    id: "4f1c9b1e-0002-4a00-8000-000000000002",
    title: "Investigar los planetas",
    description: "Buscar tres datos curiosos de cada planeta y anotarlos para la puesta en común.",
    dueDay: 17,
    priority: "high",
    status: "pending",
    assignees: [
      { kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000001" },
      { kind: "teacher", profileId: "3f1c9b1e-0002-4a00-8000-000000000101" },
    ],
  },
  {
    id: "4f1c9b1e-0002-4a00-8000-000000000003",
    title: "Presentación de la energía",
    description: "Preparar cuatro diapositivas sobre las fuentes de energía y ensayar la explicación.",
    dueDay: 18,
    priority: "high",
    status: "review",
    assignees: [
      { kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000004" },
      { kind: "teacher", profileId: "3f1c9b1e-0002-4a00-8000-000000000102" },
    ],
  },
  {
    id: "4f1c9b1e-0002-4a00-8000-000000000004",
    title: "Resumen del documental",
    description: "Escribir un resumen de diez líneas y anotar dos preguntas para el debate.",
    dueDay: 19,
    priority: "low",
    status: "done",
    assignees: [
      { kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000006" },
      { kind: "teacher", profileId: "3f1c9b1e-0002-4a00-8000-000000000101" },
    ],
  },
  {
    id: "4f1c9b1e-0002-4a00-8000-000000000005",
    title: "Maqueta del sistema solar",
    description: "Traer materiales reciclados y montar la maqueta con las órbitas a escala.",
    dueDay: 20,
    priority: "normal",
    status: "pending",
    assignees: [
      { kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000002" },
      { kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000004" },
    ],
  },
  {
    id: "4f1c9b1e-0002-4a00-8000-000000000006",
    title: "Experimento del volcán",
    description: "Montar el experimento, medir la reacción y anotar los resultados en la tabla.",
    dueDay: 24,
    priority: "normal",
    status: "active",
    assignees: [{ kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000003" }],
  },
  {
    id: "4f1c9b1e-0002-4a00-8000-000000000007",
    title: "Mural del reciclaje",
    description: "Diseñar el mural con los tres contenedores y repartir las tareas del equipo.",
    dueDay: 26,
    priority: "normal",
    status: "active",
    assignees: [
      { kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000005" },
      { kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000006" },
    ],
  },
  {
    id: "4f1c9b1e-0002-4a00-8000-000000000008",
    title: "Debate sobre el agua",
    description: "Preparar dos argumentos a favor y dos en contra del uso responsable del agua.",
    dueDay: 27,
    priority: "high",
    status: "review",
    assignees: [
      { kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000003" },
      { kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000005" },
    ],
  },
];

export const DEMO_APPS = ["excalidraw", "calculadora", "tabla-periodica", "blockly", "mermaid"] as const;

export const DEMO_MERMAID = {
  code: `flowchart LR
  A[Leemos] --> B[Investigamos]
  B --> C[Compartimos]
  C --> D[Revisamos]
  D --> E[Entregamos]`,
};

export const DEMO_BLOCKLY = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: "text_print",
        x: 48,
        y: 40,
        inputs: { TEXT: { shadow: { type: "text", fields: { TEXT: "Proyecto de demostración" } } } },
      },
      {
        type: "controls_repeat_ext",
        x: 48,
        y: 130,
        inputs: {
          TIMES: { shadow: { type: "math_number", fields: { NUM: 3 } } },
          DO: {
            block: {
              type: "text_print",
              inputs: { TEXT: { shadow: { type: "text", fields: { TEXT: "Seguimos aprendiendo" } } } },
            },
          },
        },
      },
    ],
  },
};

/**
 * Escena mínima y válida de Excalidraw para la pizarra del espacio.
 * No contiene imágenes ni enlaces: se puede repetir sin tocar R2.
 */
export const DEMO_BOARD = {
  type: "excalidraw",
  version: 2,
  source: "aula-kanban",
  appState: {},
  files: {},
  elements: [
    {
      id: "demo-titulo",
      type: "text",
      x: 80,
      y: 40,
      width: 360,
      height: 35,
      angle: 0,
      strokeColor: "#1f2937",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: 1001,
      version: 1,
      versionNonce: 1001,
      isDeleted: false,
      boundElements: [],
      updated: 1,
      link: null,
      locked: false,
      text: "Proyecto de demostración",
      fontSize: 28,
      fontFamily: 1,
      textAlign: "left",
      verticalAlign: "top",
      baseline: 30,
      containerId: null,
      originalText: "Proyecto de demostración",
      lineHeight: 1.25,
    },
    {
      id: "demo-ciencias",
      type: "rectangle",
      x: 80,
      y: 110,
      width: 280,
      height: 110,
      angle: 0,
      strokeColor: "#1971c2",
      backgroundColor: "#d0ebff",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 3 },
      seed: 1002,
      version: 1,
      versionNonce: 1002,
      isDeleted: false,
      boundElements: [{ type: "text", id: "demo-ciencias-texto" }],
      updated: 1,
      link: null,
      locked: false,
    },
    {
      id: "demo-ciencias-texto",
      type: "text",
      x: 120,
      y: 150,
      width: 200,
      height: 25,
      angle: 0,
      strokeColor: "#1971c2",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: 1003,
      version: 1,
      versionNonce: 1003,
      isDeleted: false,
      boundElements: [],
      updated: 1,
      link: null,
      locked: false,
      text: "Ciencias: el sistema solar",
      fontSize: 16,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
      baseline: 18,
      containerId: "demo-ciencias",
      originalText: "Ciencias: el sistema solar",
      lineHeight: 1.25,
    },
    {
      id: "demo-lengua",
      type: "rectangle",
      x: 420,
      y: 110,
      width: 280,
      height: 110,
      angle: 0,
      strokeColor: "#f08c00",
      backgroundColor: "#ffec99",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 3 },
      seed: 1004,
      version: 1,
      versionNonce: 1004,
      isDeleted: false,
      boundElements: [{ type: "text", id: "demo-lengua-texto" }],
      updated: 1,
      link: null,
      locked: false,
    },
    {
      id: "demo-lengua-texto",
      type: "text",
      x: 460,
      y: 150,
      width: 200,
      height: 25,
      angle: 0,
      strokeColor: "#f08c00",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: 1005,
      version: 1,
      versionNonce: 1005,
      isDeleted: false,
      boundElements: [],
      updated: 1,
      link: null,
      locked: false,
      text: "Lengua: ficha de lectura",
      fontSize: 16,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
      baseline: 18,
      containerId: "demo-lengua",
      originalText: "Lengua: ficha de lectura",
      lineHeight: 1.25,
    },
    {
      id: "demo-flecha",
      type: "arrow",
      x: 360,
      y: 165,
      width: 60,
      height: 0,
      angle: 0,
      strokeColor: "#1f2937",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 2 },
      seed: 1006,
      version: 1,
      versionNonce: 1006,
      isDeleted: false,
      boundElements: [],
      updated: 1,
      link: null,
      locked: false,
      points: [
        [0, 0],
        [60, 0],
      ],
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: "arrow",
    },
  ],
};

/**
 * Fecha del mes en curso con el día indicado, en formato ISO corto.
 * @param day - Día del mes (1–28 para que exista en cualquier mes).
 * @returns `YYYY-MM-DD`.
 */
export function currentMonthDate(day: number): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
  return date.toISOString().slice(0, 10);
}
