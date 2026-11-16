/* eslint-disable no-console -- CLI de siembra: su salida es el informe para la persona. */
import { pathToFileURL } from "node:url";

/**
 * Siembra local e idempotente del proyecto de demostración.
 *
 * Solo escribe en una instancia local (`localhost` o `127.0.0.1`) y usa las
 * cabeceras de sesión que el perfil portátil de desarrollo reconoce. Nunca
 * acepta una URL remota: la comprobación ocurre antes de abrir una conexión.
 */

/** Identificador fijo y distinto del proyecto que usa `scripts/perf-latency.mjs`. */
export const DEMO_PROJECT_ID = "22222222-2222-4222-8222-222222222222";
export const DEMO_PROJECT_NAME = "Proyecto de demostración";

const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_USER = {
  id: "local_seedy",
  email: "seedy@sites.test",
  fullName: "Seedy Local",
};

export const DEMO_STUDENTS = [
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

export const DEMO_TEACHERS = [
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
 * Tareas canónicas del proyecto. El título es la clave estable: la API crea
 * los identificadores, así que la segunda ejecución reconoce cada tarea por
 * su título dentro del proyecto de demostración.
 */
export const DEMO_TASKS = [
  {
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
    title: "Experimento del volcán",
    description: "Montar el experimento, medir la reacción y anotar los resultados en la tabla.",
    dueDay: 24,
    priority: "normal",
    status: "active",
    assignees: [{ kind: "student", profileId: "2f1c9b1e-0002-4a00-8000-000000000003" }],
  },
  {
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

export const DEMO_APPS = ["excalidraw", "calculadora", "tabla-periodica", "blockly", "mermaid"];

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
 * Interpreta los argumentos de la línea de comandos.
 * @param args - Argumentos sin `node` ni el nombre del script.
 * @returns Las opciones normalizadas.
 */
export function parseArgs(args) {
  const options = { dryRun: false, baseUrl: DEFAULT_BASE_URL };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run" || arg === "-n") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--base-url") {
      const value = args[index + 1];
      if (!value) throw new Error("Falta el valor de --base-url.");
      options.baseUrl = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Argumento desconocido: ${arg}`);
  }
  return options;
}

/**
 * Valida que la URL sea local y devuelve su origen normalizado.
 * Se ejecuta antes de cualquier `fetch`.
 * @param value - URL recibida.
 * @returns El origen `http://host[:puerto]` sin ruta.
 */
export function localBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`La URL no es válida: ${value}`);
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("La siembra solo admite http o https en localhost o 127.0.0.1.");
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`Origen remoto rechazado: ${url.hostname}. La siembra solo escribe en localhost o 127.0.0.1.`);
  }
  if (url.username || url.password) {
    throw new Error("La URL local no debe incluir credenciales.");
  }
  return url.origin;
}

/**
 * Fecha del mes en curso con el día indicado, en formato ISO corto.
 * @param day - Día del mes (1–28 para que exista en cualquier mes).
 * @returns `YYYY-MM-DD`.
 */
export function currentMonthDate(day) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
  return date.toISOString().slice(0, 10);
}

/**
 * Construye la tarea canónica con la fecha del mes actual.
 * @param task - Definición de `DEMO_TASKS`.
 * @returns Los campos que acepta `POST/PATCH /api/tasks`.
 */
export function taskFields(task) {
  return {
    title: task.title,
    description: task.description,
    imageUrl: "",
    assignee: "",
    assignees: task.assignees,
    dueDate: currentMonthDate(task.dueDay),
    priority: task.priority,
    status: task.status,
  };
}

/**
 * Error HTTP con el estado para distinguir un proyecto inexistente.
 */
export class HttpError extends Error {
  constructor(method, path, status, message) {
    super(`${method} ${path} respondió ${status}${message ? `: ${message}` : ""}`);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * Crea el cliente mínimo de la API local con la sesión de desarrollo.
 * @param baseUrl - Origen ya validado.
 * @returns Operaciones `get`, `post`, `patch` y `put`.
 */
export function createClient(baseUrl) {
  const sessionHeaders = {
    origin: baseUrl,
    "oai-authenticated-user-id": LOCAL_USER.id,
    "oai-authenticated-user-email": LOCAL_USER.email,
    "oai-authenticated-user-full-name": encodeURIComponent(LOCAL_USER.fullName),
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  };

  async function request(method, path, body) {
    const headers = { ...sessionHeaders };
    if (body !== undefined) headers["content-type"] = "application/json";
    const response = await fetch(new URL(path, baseUrl), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!response.ok) {
      const message = data && typeof data === "object" && "message" in data ? String(data.message) : "";
      throw new HttpError(method, path, response.status, message);
    }
    return data;
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    patch: (path, body) => request("PATCH", path, body),
    put: (path, body) => request("PUT", path, body),
  };
}

/**
 * Compara los campos editables de una ficha de alumno.
 * @param current - Ficha existente de la API.
 * @param expected - Ficha canónica.
 * @returns `true` si coinciden los campos que gestiona la semilla.
 */
function sameStudent(current, expected) {
  return ["name", "displayName", "role", "activities", "aiHelp"].every((key) => current[key] === expected[key]);
}

/**
 * Compara los campos editables de una ficha de profesor.
 * @param current - Ficha existente de la API.
 * @param expected - Ficha canónica.
 * @returns `true` si coinciden los campos que gestiona la semilla.
 */
function sameTeacher(current, expected) {
  return ["name", "displayName", "role", "activities", "aiHelp"].every((key) => current[key] === expected[key]);
}

/**
 * Compara los responsables de una tarea sin depender del orden.
 * @param current - Responsables actuales de la API.
 * @param expected - Responsables canónicos.
 * @returns `true` si son el mismo conjunto.
 */
function sameAssignees(current, expected) {
  const key = (ref) => `${ref.kind}:${ref.profileId}`;
  const currentKeys = new Set((current ?? []).map(key));
  const expectedKeys = new Set(expected.map(key));
  return currentKeys.size === expectedKeys.size && [...expectedKeys].every((item) => currentKeys.has(item));
}

/**
 * Indica si una tarea ya tiene los campos canónicos.
 * @param current - Tarea decorada de la API.
 * @param expected - Campos canónicos.
 * @returns `true` si no hace falta escribir.
 */
function sameTask(current, expected) {
  return current.description === expected.description
    && (current.imageUrl ?? "") === expected.imageUrl
    && current.dueDate === expected.dueDate
    && current.priority === expected.priority
    && current.status === expected.status
    && sameAssignees(current.assignees, expected.assignees);
}

/**
 * Agrupa las tareas por título para detectar duplicados antes de escribir.
 * @param tasks - Tareas actuales del proyecto.
 * @returns Mapa título → tarea; falla si hay títulos repetidos.
 */
function tasksByTitle(tasks) {
  const map = new Map();
  for (const task of tasks) {
    if (map.has(task.title)) {
      throw new Error(`Hay dos tareas con el título «${task.title}» en el proyecto de demostración. Renombra o elimina una antes de sembrar.`);
    }
    map.set(task.title, task);
  }
  return map;
}

/**
 * Ejecuta la siembra (o solo el plan con `--dry-run`).
 * @param options - Opciones de `parseArgs`.
 * @returns Resumen de acciones y recuentos.
 */
export async function run(options) {
  const baseUrl = localBaseUrl(options.baseUrl);
  const client = createClient(baseUrl);
  const projectQuery = `?project=${encodeURIComponent(DEMO_PROJECT_ID)}`;
  const actions = [];

  let projectExists = true;
  try {
    await client.get(`/api/students${projectQuery}`);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) projectExists = false;
    else throw error;
  }

  if (!projectExists) actions.push("crear el proyecto");

  const students = projectExists ? await client.get(`/api/students${projectQuery}`) : [];
  const teachers = projectExists ? await client.get(`/api/teachers${projectQuery}`) : [];
  const tasks = projectExists ? await client.get(`/api/tasks${projectQuery}`) : [];
  const apps = projectExists ? (await client.get(`/api/space-apps${projectQuery}`)).apps : [];
  const board = projectExists
    ? await client.get(`/api/boards${projectQuery}&ownerType=space&ownerId=${encodeURIComponent(DEMO_PROJECT_ID)}`)
    : { snapshot: "", revision: 0 };
  const mermaid = projectExists ? await client.get(`/api/app-documents${projectQuery}&app=mermaid`) : { state: null };
  const blockly = projectExists ? await client.get(`/api/app-documents${projectQuery}&app=blockly`) : { state: null };

  const studentsBySection = new Map(students.map((student) => [student.section, student]));
  const teachersById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const existingTasks = tasksByTitle(tasks);
  const appsById = new Map(apps.map((app) => [app.id, app]));

  for (const student of DEMO_STUDENTS) {
    const current = studentsBySection.get(student.section);
    if (!current) actions.push(`crear alumno ${student.name}`);
    else if (!sameStudent(current, student)) actions.push(`actualizar alumno ${student.name}`);
  }
  for (const teacher of DEMO_TEACHERS) {
    const current = teachersById.get(teacher.id);
    if (!current) actions.push(`crear profesor ${teacher.name}`);
    else if (!sameTeacher(current, teacher)) actions.push(`actualizar profesor ${teacher.name}`);
  }
  for (const task of DEMO_TASKS) {
    const expected = taskFields(task);
    const current = existingTasks.get(task.title);
    if (!current) actions.push(`crear tarea «${task.title}»`);
    else if (!sameTask(current, expected)) actions.push(`actualizar tarea «${task.title}»`);
  }
  for (const appId of DEMO_APPS) {
    const current = appsById.get(appId);
    if (!current || current.status !== "installed" || !current.version) actions.push(`instalar app ${appId}`);
  }
  const boardSnapshot = JSON.stringify(DEMO_BOARD);
  if ((board.snapshot ?? "") !== boardSnapshot) actions.push("escribir la pizarra del espacio");
  if (JSON.stringify(mermaid.state) !== JSON.stringify(DEMO_MERMAID)) actions.push("escribir el diagrama");
  if (JSON.stringify(blockly.state) !== JSON.stringify(DEMO_BLOCKLY)) actions.push("escribir el programa de bloques");

  if (options.dryRun) {
    return {
      mode: "dry-run",
      baseUrl,
      projectExists,
      actions: actions.length ? actions : ["sin cambios"],
      counts: {
        students: DEMO_STUDENTS.length,
        teachers: DEMO_TEACHERS.length,
        tasks: DEMO_TASKS.length,
        apps: DEMO_APPS.length,
        boards: 1,
        documents: 2,
      },
    };
  }

  const project = await client.post("/api/projects", { id: DEMO_PROJECT_ID, name: DEMO_PROJECT_NAME });
  if (project.id !== DEMO_PROJECT_ID) throw new Error("La API devolvió un proyecto distinto del solicitado.");

  const freshStudents = await client.get(`/api/students${projectQuery}`);
  const freshTeachers = await client.get(`/api/teachers${projectQuery}`);
  const freshTasks = await client.get(`/api/tasks${projectQuery}`);
  const freshStudentsBySection = new Map(freshStudents.map((student) => [student.section, student]));
  const freshTeachersById = new Map(freshTeachers.map((teacher) => [teacher.id, teacher]));
  const freshTasksByTitle = tasksByTitle(freshTasks);

  for (const student of DEMO_STUDENTS) {
    const current = freshStudentsBySection.get(student.section);
    if (!current) {
      await client.post(`/api/students${projectQuery}`, student);
    } else if (!sameStudent(current, student)) {
      await client.patch(`/api/students${projectQuery}`, { ...student, revision: current.revision });
    }
  }

  for (const teacher of DEMO_TEACHERS) {
    const current = freshTeachersById.get(teacher.id);
    if (!current) {
      await client.post(`/api/teachers${projectQuery}`, teacher);
    } else if (!sameTeacher(current, teacher)) {
      await client.patch(`/api/teachers${projectQuery}`, { ...teacher, revision: current.revision });
    }
  }

  for (const task of DEMO_TASKS) {
    const expected = taskFields(task);
    const current = freshTasksByTitle.get(task.title);
    if (!current) {
      await client.post(`/api/tasks${projectQuery}`, expected);
    } else if (!sameTask(current, expected)) {
      await client.patch(`/api/tasks${projectQuery}`, { id: current.id, revision: current.revision, changes: expected });
    }
  }

  const currentApps = new Map((await client.get(`/api/space-apps${projectQuery}`)).apps.map((app) => [app.id, app]));
  for (const appId of DEMO_APPS) {
    const current = currentApps.get(appId);
    if (!current || current.status !== "installed" || !current.version) {
      await client.post(`/api/space-apps${projectQuery}`, { id: appId, action: "install" });
    }
  }

  const currentBoard = await client.get(`/api/boards${projectQuery}&ownerType=space&ownerId=${encodeURIComponent(DEMO_PROJECT_ID)}`);
  if ((currentBoard.snapshot ?? "") !== boardSnapshot) {
    await client.put(`/api/boards${projectQuery}`, {
      ownerType: "space",
      ownerId: DEMO_PROJECT_ID,
      snapshot: boardSnapshot,
      revision: currentBoard.revision ?? 0,
    });
  }

  const currentMermaid = await client.get(`/api/app-documents${projectQuery}&app=mermaid`);
  if (JSON.stringify(currentMermaid.state) !== JSON.stringify(DEMO_MERMAID)) {
    await client.post(`/api/app-documents${projectQuery}&app=mermaid`, { state: DEMO_MERMAID });
  }
  const currentBlockly = await client.get(`/api/app-documents${projectQuery}&app=blockly`);
  if (JSON.stringify(currentBlockly.state) !== JSON.stringify(DEMO_BLOCKLY)) {
    await client.post(`/api/app-documents${projectQuery}&app=blockly`, { state: DEMO_BLOCKLY });
  }

  const finalStudents = await client.get(`/api/students${projectQuery}`);
  const finalTeachers = await client.get(`/api/teachers${projectQuery}`);
  const finalTasks = await client.get(`/api/tasks${projectQuery}`);
  const finalApps = (await client.get(`/api/space-apps${projectQuery}`)).apps;
  const finalBoard = await client.get(`/api/boards${projectQuery}&ownerType=space&ownerId=${encodeURIComponent(DEMO_PROJECT_ID)}`);
  const finalMermaid = await client.get(`/api/app-documents${projectQuery}&app=mermaid`);
  const finalBlockly = await client.get(`/api/app-documents${projectQuery}&app=blockly`);

  const studentSections = new Set(finalStudents.map((student) => student.section));
  const teacherIds = new Set(finalTeachers.map((teacher) => teacher.id));
  const taskTitles = new Map(finalTasks.map((task) => [task.title, task]));
  const taskStatusCount = finalTasks.reduce((total, task) => ({ ...total, [task.status]: (total[task.status] ?? 0) + 1 }), {});
  const missing = [];
  for (const student of DEMO_STUDENTS) if (!studentSections.has(student.section)) missing.push(`alumno ${student.name}`);
  for (const teacher of DEMO_TEACHERS) if (!teacherIds.has(teacher.id)) missing.push(`profesor ${teacher.name}`);
  for (const task of DEMO_TASKS) if (!taskTitles.has(task.title)) missing.push(`tarea «${task.title}»`);
  for (const appId of DEMO_APPS) {
    const app = finalApps.find((item) => item.id === appId);
    if (!app || app.status !== "installed") missing.push(`app ${appId}`);
  }
  if ((finalBoard.snapshot ?? "") !== boardSnapshot) missing.push("pizarra");
  if (JSON.stringify(finalMermaid.state) !== JSON.stringify(DEMO_MERMAID)) missing.push("diagrama");
  if (JSON.stringify(finalBlockly.state) !== JSON.stringify(DEMO_BLOCKLY)) missing.push("programa de bloques");

  if (missing.length) throw new Error(`La verificación final encontró datos ausentes: ${missing.join(", ")}.`);

  return {
    mode: "write",
    baseUrl,
    projectExists,
    actions: actions.length ? actions : ["sin cambios"],
    counts: {
      students: finalStudents.length,
      studentsExpected: DEMO_STUDENTS.length,
      teachers: finalTeachers.length,
      teachersExpected: DEMO_TEACHERS.length,
      tasks: finalTasks.length,
      tasksExpected: DEMO_TASKS.length,
      tasksByStatus: taskStatusCount,
      apps: finalApps.filter((app) => DEMO_APPS.includes(app.id) && app.status === "installed").length,
      appsExpected: DEMO_APPS.length,
      boards: 1,
      documents: 2,
    },
  };
}

/**
 * Imprime un resumen legible para una persona.
 * @param result - Salida de `run`.
 */
export function printResult(result) {
  console.log(`\nProyecto de demostración · ${result.baseUrl}`);
  console.log(`Modo: ${result.mode === "dry-run" ? "simulación (sin escribir)" : "siembra y verificación"}`);
  console.log(`Proyecto: ${DEMO_PROJECT_ID} · ${DEMO_PROJECT_NAME} (${result.projectExists ? "ya existía" : "se creará"})`);
  console.log("Plan:");
  for (const action of result.actions) console.log(`  - ${action}`);
  if (result.mode === "dry-run") {
    console.log(`Datos previstos: ${result.counts.students} alumnos, ${result.counts.teachers} profesores, ${result.counts.tasks} tareas, ${result.counts.apps} apps, ${result.counts.boards} pizarra y ${result.counts.documents} documentos.`);
    console.log("\nNo se ha escrito nada. Ejecuta sin --dry-run para sembrar.");
  } else {
    console.log(`Recuento final: ${result.counts.students}/${result.counts.studentsExpected} alumnos, ${result.counts.teachers}/${result.counts.teachersExpected} profesores, ${result.counts.tasks}/${result.counts.tasksExpected} tareas, ${result.counts.apps}/${result.counts.appsExpected} apps.`);
    console.log(`Tareas por estado: ${JSON.stringify(result.counts.tasksByStatus)}.`);
    console.log("Verificación final correcta: pizarra, diagrama y programa de bloques con contenido.");
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(`Uso: node scripts/seed-demo.mjs [--dry-run] [--base-url http://127.0.0.1:5173]\n\nSolo escribe en localhost o 127.0.0.1. No uses este script contra producción.`);
    } else {
      printResult(await run(options));
    }
  } catch (error) {
    console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
