/**
 * Prompts MCP compartidos por las dos puertas. Son flujos guiados sobre las
 * herramientas publicadas: si un prompt menciona una herramienta, está en el
 * catálogo y en `tools`.
 */

/** Argumento de un prompt MCP. */
export type McpPromptArgument = {
  name: string;
  description: string;
  required: boolean;
};

/** Mensaje de texto que devuelve un prompt. */
export type McpPromptMessage = {
  role: "user";
  content: { type: "text"; text: string };
};

/** Prompt MCP con su plantilla y las herramientas que utiliza. */
export type McpPrompt = {
  name: string;
  title: string;
  description: string;
  arguments: McpPromptArgument[];
  tools: string[];
  messages: (args: Record<string, string | undefined>) => McpPromptMessage[];
};

/** Envuelve un texto en un mensaje de usuario. */
const texto = (value: string): McpPromptMessage => ({ role: "user", content: { type: "text", text: value } });

/** Prompts publicados en el orden del roadmap. */
export const MCP_PROMPTS: McpPrompt[] = [
  {
    name: "resumen_de_clase",
    title: "Resumen de clase",
    description: "Prepara un resumen del estado del proyecto con tareas, vencimientos y alumnado, sin modificar nada.",
    arguments: [
      { name: "proyectoId", description: "Id del proyecto que se resume", required: true },
    ],
    tools: ["quien_soy", "obtener_resumen_proyecto", "listar_tareas", "listar_alumnos", "obtener_enlace"],
    messages: ({ proyectoId }) => [
      texto(
        `Prepara un resumen de clase del proyecto ${proyectoId}.

1. Llama primero a "quien_soy" para confirmar tu rol y que tienes acceso al proyecto.
2. Llama a "obtener_resumen_proyecto" para el total de tareas, su estado, las vencidas y las de esta semana.
3. Llama a "listar_tareas" con el proyecto y ordena por vencimiento; señala las vencidas, las que no tienen fecha y las que no tienen responsables.
4. Llama a "listar_alumnos" para contar al alumnado y detectar fichas sin cuenta vinculada.
5. Termina con "obtener_enlace" para dar el enlace de la vista de clase.

Devuelve un resumen breve en español con cifras y los enlaces. No crees, muevas ni borres nada. Si falta el proyectoId, pídelo antes de empezar.`,
      ),
    ],
  },
  {
    name: "planificar_semana",
    title: "Planificar la semana",
    description: "Propone un plan semanal a partir de las tareas y el alumnado, y espera confirmación antes de escribir.",
    arguments: [
      { name: "proyectoId", description: "Id del proyecto que se planifica", required: true },
      { name: "objetivo", description: "Objetivo opcional de la semana", required: false },
    ],
    tools: ["quien_soy", "obtener_resumen_proyecto", "listar_tareas", "listar_alumnos", "crear_tarea", "actualizar_tarea", "reprogramar_tarea", "obtener_enlace"],
    messages: ({ proyectoId, objetivo }) => [
      texto(
        `Planifica la semana del proyecto ${proyectoId}.${objetivo ? ` Objetivo: ${objetivo}.` : ""}

1. Llama a "quien_soy" y comprueba que puedes escribir en el proyecto.
2. Lee "obtener_resumen_proyecto", "listar_tareas" (por vencimiento) y "listar_alumnos".
3. Propón un plan de lunes a viernes con tareas concretas, responsables y fechas; reparte la carga y evita duplicar tareas existentes.
4. Muestra el plan y pide confirmación explícita antes de crear o cambiar nada.

Solo después de la confirmación usa "crear_tarea", "actualizar_tarea" o "reprogramar_tarea", una operación cada vez y con la revisión leída. Si no puedes escribir por tu rol, explica qué rol hace falta y no intentes un rodeo. Al final, entrega el enlace de "obtener_enlace".`,
      ),
    ],
  },
  {
    name: "alta_de_alumnado",
    title: "Alta de alumnado",
    description: "Da de alta fichas de alumnado en el proyecto, con invitación opcional, comprobando duplicados y permisos.",
    arguments: [
      { name: "proyectoId", description: "Id del proyecto donde se da de alta", required: true },
      { name: "nombres", description: "Nombres separados por comas", required: true },
      { name: "correo", description: "Correo opcional para una única alta", required: false },
    ],
    tools: ["quien_soy", "listar_alumnos", "crear_alumno", "obtener_enlace"],
    messages: ({ proyectoId, nombres, correo }) => [
      texto(
        `Da de alta al alumnado en el proyecto ${proyectoId}: ${nombres}.${correo ? ` Correo para la invitación: ${correo}.` : ""}

1. Llama a "quien_soy" y comprueba que eres profesorado, administración o propietario. Si no, explica que necesitas ese rol y detente.
2. Llama a "listar_alumnos" y compara los nombres para no crear fichas duplicadas.
3. Crea una ficha por cada nombre nuevo con "crear_alumno". El servidor genera la sección; no inventes ids.
4. Usa el campo "correoCuenta" solo si hay un único nombre y la persona ha dado su consentimiento; así queda la invitación pendiente. Si hay varios nombres y un solo correo, pide las instrucciones antes de continuar.
5. Devuelve cada ficha creada con su sección y el enlace de "obtener_enlace".

No inventes correos ni nombres que no estén en la lista. Si un alta falla, sigue con las demás y resume los errores.`,
      ),
    ],
  },
  {
    name: "instalar_apps_del_aula",
    title: "Instalar apps del aula",
    description: "Revisa el catálogo e instala en la instancia las apps indicadas, comprobando antes el rol de administración.",
    arguments: [
      { name: "proyectoId", description: "Id del proyecto desde el que se abre Mi espacio", required: true },
      { name: "apps", description: "Ids de apps separados por comas", required: true },
    ],
    tools: ["quien_soy", "listar_apps", "obtener_app", "instalar_app", "obtener_enlace"],
    messages: ({ proyectoId, apps }) => [
      texto(
        `Instala en el aula las apps: ${apps}. El proyecto para abrir Mi espacio es ${proyectoId}.

1. Llama a "quien_soy". Solo el propietario o una cuenta administradora pueden instalar apps; si no lo eres, explica quién debe hacerlo y detente.
2. Llama a "listar_apps" y comprueba qué apps del catálogo ya están instaladas.
3. Para cada app pedida, llama a "obtener_app" y confirma que existe y que su id coincide.
4. Instala las que falten con "instalar_app" (es idempotente). Si un id no existe, dilo y no inventes otro.
5. Termina con "obtener_enlace" usando la vista "espacio" y la primera app instalada, para que la persona pueda abrirla.

La instalación es de toda la instancia, no solo del proyecto. Resume qué apps quedaron instaladas.`,
      ),
    ],
  },
];

/**
 * Busca un prompt por nombre.
 * @param name - Nombre pedido por `prompts/get`.
 * @returns El prompt o `undefined` si no existe.
 */
export function promptByName(name: string): McpPrompt | undefined {
  return MCP_PROMPTS.find((prompt) => prompt.name === name);
}

/**
 * Entradas de `prompts/list` con el contrato del protocolo.
 * @returns Nombre, título, descripción y argumentos de cada prompt.
 */
export function promptListEntries() {
  return MCP_PROMPTS.map(({ name, title, description, arguments: args }) => ({ name, title, description, arguments: args }));
}
