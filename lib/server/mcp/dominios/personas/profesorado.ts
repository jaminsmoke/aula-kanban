import { createTeacher, deleteTeacher, listTeachers, updateTeacher } from "../../../people/teachers";
import { errorHerramienta, falloResolucion, payloadResult, resolve, toChatGPTUser, type McpCaller } from "../../contexto";
import { paginaDe, paginaDesde } from "../tipos";
import { avisoBaja, falloFicha, profesor } from "./comun";

/**
 * Lista el profesorado del proyecto.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto y paginación.
 * @returns El listado paginado de profesorado.
 */
export async function listarProfesores(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId } = args as { proyectoId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const fichas = await listTeachers(proyectoId, resolved.access);
  const { pagina, porPagina } = paginaDesde(args);
  const page = paginaDe(fichas.map(profesor), pagina, porPagina);
  return payloadResult({ profesores: page.items, total: page.total, pagina: page.pagina, porPagina: page.porPagina });
}

/**
 * Devuelve una ficha de profesorado por su id.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto e id de la ficha.
 * @returns La ficha encontrada o `not_found`.
 */
export async function obtenerProfesor(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId, profesorId: id } = args as { proyectoId: string; profesorId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const ficha = (await listTeachers(proyectoId, resolved.access)).find((item) => item.id === id);
  if (!ficha) return errorHerramienta("not_found", "No se encuentra la ficha en este proyecto.");
  return payloadResult({ profesor: profesor(ficha) });
}

type AltaProfesor = { proyectoId: string; nombre: string; nombreVisible?: string; rol?: string; actividad?: string; ayudaIA?: string; correoCuenta?: string };

/**
 * Crea una ficha de profesorado y, si procede, una invitación pendiente.
 * @param caller - Cuenta identificada por el token.
 * @param args - Datos de la ficha.
 * @returns La ficha creada o el error del contrato.
 */
export async function crearProfesor(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as AltaProfesor;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  if (resolved.access.role === "student" || resolved.access.role === "guest") return errorHerramienta("forbidden", "No tienes permiso para gestionar fichas de profesores.");
  if (resolved.access.role === "teacher") return errorHerramienta("forbidden", "Solo un administrador puede añadir profesores.");
  const project = { ...resolved.project, access: resolved.access };
  const result = await createTeacher(project, {
    name: a.nombre,
    displayName: a.nombreVisible ?? "",
    role: a.rol ?? "",
    activities: a.actividad ?? "",
    aiHelp: a.ayudaIA ?? "",
    id: crypto.randomUUID(),
    accountEmail: a.correoCuenta ?? "",
  });
  return result.ok ? payloadResult({ profesor: profesor(result.ficha) }) : falloFicha(result);
}

type EdicionProfesor = { proyectoId: string; profesorId: string; revision: number; nombre?: string; nombreVisible?: string; rol?: string; actividad?: string; ayudaIA?: string; correoCuenta?: string };

/**
 * Actualiza una ficha de profesorado con su revisión.
 * @param caller - Cuenta identificada por el token.
 * @param args - Ficha y campos que se actualizan.
 * @returns La ficha actualizada o el error del contrato.
 */
export async function actualizarProfesor(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as EdicionProfesor;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  if (resolved.access.role === "student" || resolved.access.role === "guest") return errorHerramienta("forbidden", "No tienes permiso para gestionar fichas de profesores.");
  if (resolved.access.role === "teacher" && resolved.access.teacherId !== a.profesorId) return errorHerramienta("forbidden", "Solo puedes gestionar tu propia ficha de profesor.");
  const fichas = await listTeachers(a.proyectoId, resolved.access);
  const actual = fichas.find((item) => item.id === a.profesorId);
  if (!actual) return errorHerramienta("not_found", "No se encuentra la ficha en este proyecto.");
  const project = { ...resolved.project, access: resolved.access };
  const result = await updateTeacher(
    project,
    a.profesorId,
    a.revision,
    {
      name: a.nombre ?? actual.name,
      displayName: a.nombreVisible ?? actual.displayName,
      role: a.rol ?? actual.role,
      activities: a.actividad ?? actual.activities,
      aiHelp: a.ayudaIA ?? actual.aiHelp,
    },
    a.correoCuenta,
  );
  return result.ok ? payloadResult({ profesor: profesor(result.ficha) }) : falloFicha(result);
}

type BajaProfesor = { proyectoId: string; profesorId: string; revision: number; confirmar?: boolean; nombre?: string };

/**
 * Elimina una ficha de profesorado tras el aviso y el nombre exacto.
 * @param caller - Cuenta identificada por el token.
 * @param args - Ficha y confirmación.
 * @returns El aviso de confirmación o la ficha eliminada.
 */
export async function eliminarProfesor(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as BajaProfesor;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  if (resolved.access.role === "student" || resolved.access.role === "guest") return errorHerramienta("forbidden", "No tienes permiso para gestionar fichas de profesores.");
  if (resolved.access.role === "teacher" && resolved.access.teacherId !== a.profesorId) return errorHerramienta("forbidden", "Solo puedes gestionar tu propia ficha de profesor.");
  const fichas = await listTeachers(a.proyectoId, resolved.access);
  const actual = fichas.find((item) => item.id === a.profesorId);
  if (!actual) return errorHerramienta("not_found", "No se encuentra la ficha en este proyecto.");
  const nombre = actual.displayName || actual.name;
  if (a.confirmar !== true) return avisoBaja("eliminar_profesor", a.proyectoId, nombre, actual.revision);
  if ((a.nombre ?? "").trim() !== nombre) return errorHerramienta("invalid", "Escribe el nombre exacto de la ficha para confirmar la baja.");
  const result = await deleteTeacher({ ...resolved.project, access: resolved.access }, a.profesorId, a.revision);
  return result.ok ? payloadResult({ eliminado: a.profesorId, nombre }) : falloFicha(result);
}
