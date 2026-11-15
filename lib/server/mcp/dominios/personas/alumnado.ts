import { createStudent, deleteStudent, listStudents, updateStudent } from "../../../people/students";
import { errorHerramienta, falloResolucion, payloadResult, resolve, toChatGPTUser, type McpCaller } from "../../contexto";
import { paginaDe, paginaDesde } from "../tipos";
import { alumno, avisoBaja, falloFicha } from "./comun";

/**
 * Lista el alumnado del proyecto.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto y paginación.
 * @returns El listado paginado de alumnado.
 */
export async function listarAlumnos(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId } = args as { proyectoId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const fichas = await listStudents(proyectoId, resolved.access);
  const { pagina, porPagina } = paginaDesde(args);
  const page = paginaDe(fichas.map(alumno), pagina, porPagina);
  return payloadResult({ alumnos: page.items, total: page.total, pagina: page.pagina, porPagina: page.porPagina });
}

/**
 * Devuelve una ficha de alumnado por su sección.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto y sección.
 * @returns La ficha encontrada o `not_found`.
 */
export async function obtenerAlumno(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId, seccion: section } = args as { proyectoId: string; seccion: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const ficha = (await listStudents(proyectoId, resolved.access)).find((item) => item.section === section);
  if (!ficha) return errorHerramienta("not_found", "No se encuentra la ficha en este proyecto.");
  return payloadResult({ alumno: alumno(ficha) });
}

type AltaAlumno = { proyectoId: string; nombre: string; nombreVisible?: string; rol?: string; actividad?: string; ayudaIA?: string; correoCuenta?: string };

/**
 * Crea una ficha de alumnado y, si procede, una invitación pendiente.
 * @param caller - Cuenta identificada por el token.
 * @param args - Datos de la ficha.
 * @returns La ficha creada o el error del contrato.
 */
export async function crearAlumno(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as AltaAlumno;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  if (resolved.access.role === "student" || resolved.access.role === "guest") return errorHerramienta("forbidden", "Solo el profesorado puede crear fichas.");
  const project = { ...resolved.project, access: resolved.access };
  const result = await createStudent(project, {
    name: a.nombre,
    displayName: a.nombreVisible ?? "",
    role: a.rol ?? "",
    activities: a.actividad ?? "",
    aiHelp: a.ayudaIA ?? "",
    section: crypto.randomUUID(),
    accountEmail: a.correoCuenta ?? "",
  });
  return result.ok ? payloadResult({ alumno: alumno(result.ficha) }) : falloFicha(result);
}

type EdicionAlumno = { proyectoId: string; seccion: string; revision: number; nombre?: string; nombreVisible?: string; rol?: string; actividad?: string; ayudaIA?: string; correoCuenta?: string };

/**
 * Actualiza una ficha de alumnado con su revisión.
 * @param caller - Cuenta identificada por el token.
 * @param args - Ficha y campos que se actualizan.
 * @returns La ficha actualizada o el error del contrato.
 */
export async function actualizarAlumno(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as EdicionAlumno;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  if (resolved.access.role === "guest" || (resolved.access.role === "student" && resolved.access.studentSection !== a.seccion)) {
    return errorHerramienta("forbidden", "Solo puedes editar tu propia ficha.");
  }
  const fichas = await listStudents(a.proyectoId, resolved.access);
  const actual = fichas.find((item) => item.section === a.seccion);
  if (!actual) return errorHerramienta("not_found", "No se encuentra la ficha en este proyecto.");
  const project = { ...resolved.project, access: resolved.access };
  const result = await updateStudent(
    project,
    a.seccion,
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
  return result.ok ? payloadResult({ alumno: alumno(result.ficha) }) : falloFicha(result);
}

type BajaAlumno = { proyectoId: string; seccion: string; revision: number; confirmar?: boolean; nombre?: string };

/**
 * Elimina una ficha de alumnado tras el aviso y el nombre exacto.
 * @param caller - Cuenta identificada por el token.
 * @param args - Ficha y confirmación.
 * @returns El aviso de confirmación o la ficha eliminada.
 */
export async function eliminarAlumno(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as BajaAlumno;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  if (resolved.access.role === "guest" || (resolved.access.role === "student" && resolved.access.studentSection !== a.seccion)) {
    return errorHerramienta("forbidden", "Solo puedes editar tu propia ficha.");
  }
  const fichas = await listStudents(a.proyectoId, resolved.access);
  const actual = fichas.find((item) => item.section === a.seccion);
  if (!actual) return errorHerramienta("not_found", "No se encuentra la ficha en este proyecto.");
  const nombre = actual.displayName || actual.name;
  if (a.confirmar !== true) return avisoBaja("eliminar_alumno", a.proyectoId, nombre, actual.revision);
  if ((a.nombre ?? "").trim() !== nombre) return errorHerramienta("invalid", "Escribe el nombre exacto de la ficha para confirmar la baja.");
  const result = await deleteStudent({ ...resolved.project, access: resolved.access }, a.seccion, a.revision);
  return result.ok ? payloadResult({ eliminada: a.seccion, nombre }) : falloFicha(result);
}
