import { z } from "zod";
import { priorities, statuses } from "../../../lib/domain/task";

/**
 * Contrato de las herramientas del servidor MCP.
 *
 * Los nombres y esquemas quedan fijados aquí; los manejadores viven en
 * `reads.ts` (lectura) y `writes.ts` (escritura) y reutilizan `lib/server`.
 */

const projectId = z.string().uuid().describe("Id del proyecto de Aula Kanban");
const taskId = z.string().uuid().describe("Id de la tarea");
const person = z.object({
  kind: z.enum(["student", "teacher"]).describe("Tipo de perfil responsable"),
  profileId: z.string().min(1).max(80).describe("Id del perfil (sección de alumno o de profesor)"),
});
const revision = z.number().int().positive().optional().describe("Revisión conocida de la tarea; si se omite se usa la actual");

/** Una herramienta con su nombre, descripción y esquema de entrada. */
export type McpTool = {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
};

/** Las 8 herramientas de la v1, con el mismo significado que la API HTTP. */
export const MCP_TOOLS: McpTool[] = [
  {
    name: "listar_proyectos",
    description: "Lista los proyectos de Aula Kanban visibles para la cuenta del token.",
    inputSchema: {},
  },
  {
    name: "listar_tareas",
    description: "Lista las tareas de un proyecto con filtros opcionales. Sin `proyectoId` lista las tareas de todos los proyectos visibles.",
    inputSchema: {
      proyectoId: projectId.optional(),
      estado: z.enum(statuses).optional().describe("Estado de la tarea"),
      prioridad: z.enum(priorities).optional().describe("Prioridad de la tarea"),
      alumno: z.string().max(80).optional().describe("Filtra por sección de alumnado asignada"),
      texto: z.string().max(120).optional().describe("Busca en título y descripción"),
      pagina: z.number().int().min(1).optional(),
      porPagina: z.number().int().min(1).max(100).optional(),
    },
  },
  {
    name: "obtener_tarea",
    description: "Devuelve una tarea con sus responsables, su estado y su revisión.",
    inputSchema: { proyectoId: projectId, tareaId: taskId },
  },
  {
    name: "listar_alumnos",
    description: "Lista el alumnado del proyecto (sección, nombre y actividad).",
    inputSchema: { proyectoId: projectId },
  },
  {
    name: "listar_profesores",
    description: "Lista el profesorado del proyecto (id y nombre).",
    inputSchema: { proyectoId: projectId },
  },
  {
    name: "crear_tarea",
    description: "Crea una tarea en el proyecto. Respeta los permisos de la cuenta: un alumno solo puede asignársela a sí mismo o dejarla sin asignar, y una cuenta invitada no puede crear.",
    inputSchema: {
      proyectoId: projectId,
      titulo: z.string().trim().min(1).max(120),
      descripcion: z.string().trim().max(2000).optional(),
      imagenUrl: z.string().trim().max(2048).optional(),
      responsable: z.string().trim().max(5000).optional().describe("Texto libre de responsable (mismo campo que la web)"),
      responsables: z.array(person).max(50).optional(),
      vencimiento: z.union([z.literal(""), z.string().date()]).optional().describe("Fecha de vencimiento (YYYY-MM-DD)"),
      prioridad: z.enum(priorities),
      estado: z.enum(statuses),
    },
  },
  {
    name: "actualizar_tarea",
    description: "Actualiza los campos indicados de una tarea o solo su estado. Devuelve la revisión nueva para la siguiente operación.",
    inputSchema: {
      proyectoId: projectId,
      tareaId: taskId,
      revision,
      titulo: z.string().trim().min(1).max(120).optional(),
      descripcion: z.string().trim().max(2000).optional(),
      imagenUrl: z.string().trim().max(2048).optional(),
      responsable: z.string().trim().max(5000).optional(),
      responsables: z.array(person).max(50).optional(),
      vencimiento: z.union([z.literal(""), z.string().date()]).optional(),
      prioridad: z.enum(priorities).optional(),
      estado: z.enum(statuses).optional(),
    },
  },
  {
    name: "eliminar_tarea",
    description: "Elimina una tarea del proyecto. No se puede deshacer.",
    inputSchema: { proyectoId: projectId, tareaId: taskId, revision },
  },
];

