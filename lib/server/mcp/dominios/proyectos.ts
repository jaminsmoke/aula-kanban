import { z } from "zod";
import { isOwner } from "../../projects/project-access";
import { createProject, deleteProject, listVisibleProjects, projectDeletionInfo } from "../../projects/projects";
import { calendarUrl, projectUrl } from "../enlaces";
import { errorHerramienta, payloadResult, toChatGPTUser, type McpCaller } from "../contexto";
import { paginaDe, paginaDesde, type McpToolDefinicion } from "./tipos";

/**
 * Dominio de proyectos: listar los proyectos visibles de la cuenta.
 *
 * Reutiliza `listVisibleProjects` (`lib/server/projects.ts`): el rol global
 * se resuelve una sola vez y el resto va por membresía.
 */

/**
 * Lista los proyectos visibles para la cuenta, con su rol y sus enlaces.
 * @param caller - Cuenta del token.
 * @param args - `pagina` y `porPagina` opcionales.
 * @returns Los proyectos de la página con su rol y enlaces, más el total.
 */
async function listarProyectos(caller: McpCaller, args: Record<string, unknown>) {
  const { pagina, porPagina } = paginaDesde(args);
  const visibles = await listVisibleProjects(toChatGPTUser(caller));
  const page = paginaDe(
    visibles.map(({ project, access }) => ({
      id: project.id,
      nombre: project.name,
      rol: access.role,
      enlace: projectUrl(caller.origen, project.id),
      calendario: calendarUrl(caller.origen, project.id),
    })),
    pagina,
    porPagina,
  );
  return payloadResult({ proyectos: page.items, total: page.total, pagina: page.pagina, porPagina: page.porPagina });
}

async function crearProyecto(caller: McpCaller, args: Record<string, unknown>) {
  const { nombre } = args as { nombre: string };
  const user = toChatGPTUser(caller);
  const result = await createProject(user, { id: crypto.randomUUID(), name: nombre });
  if (!result.ok) {
    const codigo = result.status === 400 ? "invalid" : result.status === 403 ? "forbidden" : result.status === 409 ? "conflict" : "error";
    return errorHerramienta(codigo, result.message);
  }
  const rol = (await isOwner(user)) ? "owner" : "admin";
  return payloadResult({
    proyecto: { id: result.proyecto.id, nombre: result.proyecto.name, rol, enlace: projectUrl(caller.origen, result.proyecto.id), creado: result.creado },
  });
}

/**
 * Aviso previo al borrado de un proyecto, con su recuento.
 * @param proyectoId - Proyecto que se eliminará.
 * @param nombre - Nombre exacto del proyecto.
 * @param resumen - Contenido que se perderá.
 * @returns El resultado con el aviso y sin borrar nada.
 */
function avisoProyecto(proyectoId: string, nombre: string, resumen: Record<string, number>) {
  return payloadResult({
    necesitaConfirmacion: true,
    herramienta: "eliminar_proyecto",
    proyectoId,
    nombre,
    resumen,
    mensaje: "Esta acción eliminará el proyecto y todo su contenido (tareas, fichas, miembros, pizarras, documentos y archivos). No se puede deshacer. Escribe el nombre exacto en confirmarNombre y llama de nuevo con confirmar: true para continuar.",
  });
}

async function eliminarProyecto(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { proyectoId: string; confirmarNombre?: string; confirmar?: boolean };
  const info = await projectDeletionInfo(toChatGPTUser(caller), a.proyectoId);
  if (!info.ok) {
    const codigo = info.status === 403 ? "forbidden" : info.status === 404 ? "not_found" : "invalid";
    return errorHerramienta(codigo, info.message);
  }
  if (a.confirmar !== true) return avisoProyecto(a.proyectoId, info.proyecto.name, info.resumen);
  if ((a.confirmarNombre ?? "").trim() !== info.proyecto.name) {
    return errorHerramienta("invalid", "Escribe el nombre exacto del proyecto para confirmar la eliminación.");
  }
  const result = await deleteProject(toChatGPTUser(caller), a.proyectoId);
  return result.ok
    ? payloadResult({ id: result.id, deleted: result.deleted })
    : errorHerramienta(result.status === 503 ? "unavailable" : "error", result.message);
}

/** Herramientas del dominio de proyectos. */
export const herramientasProyectos: McpToolDefinicion[] = [
  {
    name: "listar_proyectos",
    title: "Listar proyectos",
    description: "Lista los proyectos de Aula Kanban visibles para la cuenta del token.",
    inputSchema: {
      pagina: z.number().int().min(1).optional(),
      porPagina: z.number().int().min(1).max(100).optional(),
    },
    outputSchema: {
      proyectos: z.array(z.record(z.unknown())),
      total: z.number(),
      pagina: z.number(),
      porPagina: z.number(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarProyectos,
  },
  {
    name: "crear_proyecto",
    title: "Crear proyecto",
    description: "Crea un proyecto nuevo con su nombre; el servidor genera el id y devuelve el enlace. Solo el propietario o la administración pueden crear proyectos.",
    inputSchema: { nombre: z.string().trim().min(1).max(80).describe("Nombre del proyecto") },
    outputSchema: { proyecto: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: crearProyecto,
  },
  {
    name: "eliminar_proyecto",
    title: "Eliminar proyecto",
    description: "Elimina un proyecto y todo su contenido. Sin `confirmar: true` devuelve el recuento de lo que se borrará; después exige el nombre exacto en `confirmarNombre`. Solo el propietario o la administración.",
    inputSchema: {
      proyectoId: z.string().min(1).max(80).describe("Id del proyecto que se elimina"),
      confirmarNombre: z.string().trim().min(1).max(80).optional().describe("Nombre exacto del proyecto para confirmar"),
      confirmar: z.boolean().optional().describe("Llama con true para eliminar tras ver el aviso"),
    },
    outputSchema: {
      id: z.string().optional(),
      deleted: z.boolean().optional(),
      necesitaConfirmacion: z.boolean().optional(),
      herramienta: z.string().optional(),
      proyectoId: z.string().optional(),
      nombre: z.string().optional(),
      resumen: z.record(z.number()).optional(),
      mensaje: z.string().optional(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    handler: eliminarProyecto,
  },
];
