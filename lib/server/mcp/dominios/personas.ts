import { z } from "zod";
import { findMember, inviteMember, listMembers, removeMember, type Member } from "../../members";
import { createStudent, deleteStudent, listStudents, updateStudent, type StudentFicha } from "../../people/students";
import { createTeacher, deleteTeacher, listTeachers, updateTeacher, type TeacherFicha } from "../../people/teachers";
import { errorHerramienta, falloResolucion, payloadResult, resolve, toChatGPTUser, type McpCaller, type ToolResult } from "../contexto";
import { paginaDe, paginaDesde, type McpToolDefinicion } from "./tipos";

/**
 * Dominio de personas (MCP-06): fichas de alumnado y profesorado con su rol,
 * revisión y estado de cuenta. La lectura y las mutaciones reutilizan
 * `lib/server/people/`, la misma lógica que `/api/students` y `/api/teachers`,
 * y el correo de la cuenta solo aparece cuando la web también lo mostraría.
 */

const projectId = z.string().uuid().describe("Id del proyecto de Aula Kanban");
const seccion = z.string().min(1).max(80).describe("Sección de la ficha de alumnado");
const profesorId = z.string().min(1).max(80).describe("Id de la ficha de profesorado");
const revision = z.number().int().positive().describe("Revisión leída antes de editar");
const nombre = z.string().trim().min(1).max(80).describe("Nombre de la ficha");
const nombreVisible = z.string().trim().max(80).optional().describe("Nombre visible; por defecto, el nombre");
const rol = z.string().trim().max(500).optional().describe("Rol o nota de la ficha");
const actividad = z.string().trim().max(2000).optional().describe("Actividad de la ficha");
const ayudaIA = z.string().trim().max(2000).optional().describe("Ayuda de IA de la ficha");
const correoCuenta = z.string().trim().max(254).optional().describe("Correo que crea la invitación pendiente");
const fichaEditable = { nombre: nombre.optional(), nombreVisible, rol, actividad, ayudaIA, correoCuenta };

/**
 * Ficha de alumnado en el contrato: nombres en español y campos estables.
 * @param ficha - Ficha leída de la base con su estado de cuenta.
 * @returns La ficha para `structuredContent`.
 */
function alumno(ficha: StudentFicha) {
  return {
    seccion: ficha.section,
    nombre: ficha.displayName || ficha.name,
    nombreVisible: ficha.displayName,
    rol: ficha.role,
    actividad: ficha.activities,
    ayudaIA: ficha.aiHelp,
    revision: ficha.revision,
    estadoCuenta: ficha.accountStatus,
    ...(ficha.accountEmail !== undefined ? { correoCuenta: ficha.accountEmail } : {}),
  };
}

/**
 * Ficha de profesorado en el contrato: nombres en español y campos estables.
 * @param ficha - Ficha leída de la base con su estado de cuenta.
 * @returns La ficha para `structuredContent`.
 */
function profesor(ficha: TeacherFicha) {
  return {
    id: ficha.id,
    nombre: ficha.displayName || ficha.name,
    nombreVisible: ficha.displayName,
    rol: ficha.role,
    actividad: ficha.activities,
    ayudaIA: ficha.aiHelp,
    revision: ficha.revision,
    estadoCuenta: ficha.accountStatus,
    ...(ficha.accountEmail !== undefined ? { correoCuenta: ficha.accountEmail } : {}),
  };
}

/**
 * Miembro del proyecto en el contrato: sin `userId` y con nombres en español.
 * @param member - Fila de `project_members` sin el identificador de cuenta.
 * @returns El miembro para `structuredContent`.
 */
function miembro(member: Member) {
  return {
    id: member.id,
    correo: member.email,
    rol: member.role,
    seccion: member.studentSection,
    profesorId: member.teacherId,
    estado: member.status,
  };
}

/**
 * Traduce el fallo de una mutación de fichas al contrato MCP.
 * @param result - Fallo con estado HTTP y mensaje de la web.
 * @returns El resultado de herramienta con `isError`.
 */
function falloFicha(result: { status: number; message: string }): ToolResult {
  const codigo = result.status === 400 ? "invalid" : result.status === 403 ? "forbidden" : result.status === 404 ? "not_found" : result.status === 409 ? "conflict" : result.status === 503 ? "unavailable" : "error";
  return errorHerramienta(codigo, result.message);
}

async function listarAlumnos(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId } = args as { proyectoId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const fichas = await listStudents(proyectoId, resolved.access);
  const { pagina, porPagina } = paginaDesde(args);
  const page = paginaDe(fichas.map(alumno), pagina, porPagina);
  return payloadResult({ alumnos: page.items, total: page.total, pagina: page.pagina, porPagina: page.porPagina });
}

async function listarProfesores(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId } = args as { proyectoId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const fichas = await listTeachers(proyectoId, resolved.access);
  const { pagina, porPagina } = paginaDesde(args);
  const page = paginaDe(fichas.map(profesor), pagina, porPagina);
  return payloadResult({ profesores: page.items, total: page.total, pagina: page.pagina, porPagina: page.porPagina });
}

async function obtenerAlumno(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId, seccion: section } = args as { proyectoId: string; seccion: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const ficha = (await listStudents(proyectoId, resolved.access)).find((item) => item.section === section);
  if (!ficha) return errorHerramienta("not_found", "No se encuentra la ficha en este proyecto.");
  return payloadResult({ alumno: alumno(ficha) });
}

async function obtenerProfesor(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId, profesorId: id } = args as { proyectoId: string; profesorId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const ficha = (await listTeachers(proyectoId, resolved.access)).find((item) => item.id === id);
  if (!ficha) return errorHerramienta("not_found", "No se encuentra la ficha en este proyecto.");
  return payloadResult({ profesor: profesor(ficha) });
}

async function listarMiembros(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId } = args as { proyectoId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const result = await listMembers(proyectoId, resolved.access);
  if (!result.ok) return errorHerramienta(result.status === 403 ? "forbidden" : "error", result.message);
  return payloadResult({ miembros: result.miembros.map(miembro) });
}

type Invitacion = { proyectoId: string; correo: string; rol: "teacher" | "student" | "guest"; seccion?: string; profesorId?: string };

async function invitarMiembro(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as Invitacion;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const result = await inviteMember(
    { ...resolved.project, access: resolved.access },
    { email: a.correo, role: a.rol, studentSection: a.seccion ?? null, teacherId: a.profesorId ?? null },
  );
  return result.ok ? payloadResult({ miembro: miembro(result.miembro), creada: result.creada }) : falloFicha(result);
}

type Retirada = { proyectoId: string; miembroId: string; confirmar?: boolean };

async function retirarMiembro(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as Retirada;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const project = { ...resolved.project, access: resolved.access };
  const found = await findMember(project, a.miembroId);
  if (!found.ok) return falloFicha(found);
  if (a.confirmar !== true) {
    const actual = miembro(found.miembro);
    return payloadResult({
      necesitaConfirmacion: true,
      herramienta: "retirar_miembro",
      proyectoId: a.proyectoId,
      miembroId: a.miembroId,
      correo: actual.correo,
      rol: actual.rol,
      mensaje: "Esta acción retirará el acceso de esa cuenta al proyecto. Llama de nuevo con confirmar: true para continuar.",
    });
  }
  const result = await removeMember(project, a.miembroId);
  return result.ok ? payloadResult({ retirado: result.id }) : falloFicha(result);
}

type AltaAlumno = { proyectoId: string; nombre: string; nombreVisible?: string; rol?: string; actividad?: string; ayudaIA?: string; correoCuenta?: string };
type EdicionAlumno = { proyectoId: string; seccion: string; revision: number; nombre?: string; nombreVisible?: string; rol?: string; actividad?: string; ayudaIA?: string; correoCuenta?: string };
type AltaProfesor = { proyectoId: string; nombre: string; nombreVisible?: string; rol?: string; actividad?: string; ayudaIA?: string; correoCuenta?: string };
type EdicionProfesor = { proyectoId: string; profesorId: string; revision: number; nombre?: string; nombreVisible?: string; rol?: string; actividad?: string; ayudaIA?: string; correoCuenta?: string };

async function crearAlumno(caller: McpCaller, args: Record<string, unknown>) {
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

async function crearProfesor(caller: McpCaller, args: Record<string, unknown>) {
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

async function actualizarAlumno(caller: McpCaller, args: Record<string, unknown>) {
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

async function actualizarProfesor(caller: McpCaller, args: Record<string, unknown>) {
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

type BajaAlumno = { proyectoId: string; seccion: string; revision: number; confirmar?: boolean; nombre?: string };
type BajaProfesor = { proyectoId: string; profesorId: string; revision: number; confirmar?: boolean; nombre?: string };

/**
 * Texto del aviso previo a una baja, igual en las dos herramientas.
 * @param herramienta - Nombre de la herramienta que pide confirmación.
 * @param proyectoId - Proyecto de la ficha.
 * @param nombre - Nombre exacto de la ficha.
 * @param revision - Revisión leída de la ficha.
 * @returns El resultado con el aviso y sin borrar nada.
 */
function avisoBaja(herramienta: string, proyectoId: string, nombre: string, revision: number) {
  return payloadResult({
    necesitaConfirmacion: true,
    herramienta,
    proyectoId,
    nombre,
    revision,
    mensaje: "Esta acción eliminará la ficha y retirará su cuenta del proyecto; pasará al histórico de 30 días. Llama de nuevo con confirmar: true y el nombre exacto para continuar.",
  });
}

async function eliminarAlumno(caller: McpCaller, args: Record<string, unknown>) {
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

async function eliminarProfesor(caller: McpCaller, args: Record<string, unknown>) {
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

/** Herramientas del dominio de personas. */
export const herramientasPersonas: McpToolDefinicion[] = [
  {
    name: "listar_alumnos",
    title: "Listar alumnado",
    description: "Lista el alumnado del proyecto con sección, nombre, rol, actividad, revisión y estado de cuenta; el correo solo si la cuenta puede verlo.",
    inputSchema: {
      proyectoId: projectId,
      pagina: z.number().int().min(1).optional(),
      porPagina: z.number().int().min(1).max(100).optional(),
    },
    outputSchema: {
      alumnos: z.array(z.record(z.unknown())),
      total: z.number(),
      pagina: z.number(),
      porPagina: z.number(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarAlumnos,
  },
  {
    name: "listar_profesores",
    title: "Listar profesorado",
    description: "Lista el profesorado del proyecto con id, nombre, rol, actividad, revisión y estado de cuenta; el correo solo si la cuenta puede verlo.",
    inputSchema: {
      proyectoId: projectId,
      pagina: z.number().int().min(1).optional(),
      porPagina: z.number().int().min(1).max(100).optional(),
    },
    outputSchema: {
      profesores: z.array(z.record(z.unknown())),
      total: z.number(),
      pagina: z.number(),
      porPagina: z.number(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarProfesores,
  },
  {
    name: "obtener_alumno",
    title: "Obtener alumnado",
    description: "Devuelve una ficha de alumnado por su sección, con rol, actividad, revisión y estado de cuenta. Falla con not_found si no existe en el proyecto.",
    inputSchema: { proyectoId: projectId, seccion },
    outputSchema: { alumno: z.record(z.unknown()) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: obtenerAlumno,
  },
  {
    name: "obtener_profesor",
    title: "Obtener profesorado",
    description: "Devuelve una ficha de profesorado por su id, con rol, actividad, revisión y estado de cuenta. Falla con not_found si no existe en el proyecto.",
    inputSchema: { proyectoId: projectId, profesorId },
    outputSchema: { profesor: z.record(z.unknown()) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: obtenerProfesor,
  },
  {
    name: "listar_miembros",
    title: "Listar miembros",
    description: "Lista los miembros e invitaciones del proyecto sin exponer el userId. El alumnado y los invitados reciben 403; el profesorado solo ve alumnado y su propia ficha.",
    inputSchema: { proyectoId: projectId },
    outputSchema: { miembros: z.array(z.record(z.unknown())) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarMiembros,
  },
  {
    name: "invitar_miembro",
    title: "Invitar miembro",
    description: "Crea o actualiza una invitación pendiente con correo, rol y la ficha que corresponda; invitar no envía correo. El profesorado solo invita alumnado y cada cual puede invitarse a sí mismo. Falla con 400 si la ficha no encaja con el rol y con 409 si la cuenta ya tiene otro rol.",
    inputSchema: {
      proyectoId: projectId,
      correo: z.string().trim().email().max(254).describe("Correo de la cuenta que se invita"),
      rol: z.enum(["teacher", "student", "guest"]).describe("Rol dentro del proyecto"),
      seccion: seccion.optional().describe("Sección de la ficha de alumnado (solo rol student)"),
      profesorId: z.string().uuid().optional().describe("Id de la ficha de profesorado (solo rol teacher)"),
    },
    outputSchema: { miembro: z.record(z.unknown()), creada: z.boolean() },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: invitarMiembro,
  },
  {
    name: "retirar_miembro",
    title: "Retirar miembro",
    description: "Retira el acceso de una cuenta o una invitación del proyecto. Sin `confirmar: true` devuelve un aviso con el correo y el rol. El profesorado solo retira alumnado y cada cual puede retirarse a sí mismo.",
    inputSchema: {
      proyectoId: projectId,
      miembroId: z.string().uuid().describe("Id del miembro o de la invitación"),
      confirmar: z.boolean().optional().describe("Llama con true para retirar tras ver el aviso"),
    },
    outputSchema: {
      retirado: z.string().optional(),
      necesitaConfirmacion: z.boolean().optional(),
      herramienta: z.string().optional(),
      proyectoId: z.string().optional(),
      miembroId: z.string().optional(),
      correo: z.string().optional(),
      rol: z.string().optional(),
      mensaje: z.string().optional(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    handler: retirarMiembro,
  },
  {
    name: "crear_alumno",
    title: "Crear alumnado",
    description: "Crea una ficha de alumnado (el servidor genera la sección) y, si se pasa correo, deja la invitación pendiente. Solo profesorado, administración y propietario.",
    inputSchema: { proyectoId: projectId, nombre, nombreVisible, rol, actividad, ayudaIA, correoCuenta },
    outputSchema: { alumno: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: crearAlumno,
  },
  {
    name: "crear_profesor",
    title: "Crear profesorado",
    description: "Crea una ficha de profesorado (el servidor genera el id) y, si se pasa correo, deja la invitación pendiente. Solo administración y propietario.",
    inputSchema: { proyectoId: projectId, nombre, nombreVisible, rol, actividad, ayudaIA, correoCuenta },
    outputSchema: { profesor: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: crearProfesor,
  },
  {
    name: "actualizar_alumno",
    title: "Actualizar alumnado",
    description: "Edita una ficha de alumnado con su revisión; los campos que no se envían se conservan. El alumnado solo puede editar su propia ficha y los invitados no editan.",
    inputSchema: { proyectoId: projectId, seccion, revision, ...fichaEditable },
    outputSchema: { alumno: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: actualizarAlumno,
  },
  {
    name: "actualizar_profesor",
    title: "Actualizar profesorado",
    description: "Edita una ficha de profesorado con su revisión; los campos que no se envían se conservan. El profesorado solo puede editar su propia ficha.",
    inputSchema: { proyectoId: projectId, profesorId, revision, ...fichaEditable },
    outputSchema: { profesor: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: actualizarProfesor,
  },
  {
    name: "eliminar_alumno",
    title: "Eliminar alumnado",
    description: "Elimina una ficha de alumnado con su revisión. Sin `confirmar: true` devuelve un aviso; después exige el nombre exacto. Pasa al histórico de 30 días y retira su cuenta del proyecto.",
    inputSchema: {
      proyectoId: projectId,
      seccion,
      revision,
      confirmar: z.boolean().optional().describe("Llama con true para eliminar tras ver el aviso"),
      nombre: z.string().trim().min(1).max(80).optional().describe("Nombre exacto de la ficha para confirmar la baja"),
    },
    outputSchema: {
      eliminada: z.string().optional(),
      necesitaConfirmacion: z.boolean().optional(),
      herramienta: z.string().optional(),
      proyectoId: z.string().optional(),
      nombre: z.string().optional(),
      revision: z.number().optional(),
      mensaje: z.string().optional(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    handler: eliminarAlumno,
  },
  {
    name: "eliminar_profesor",
    title: "Eliminar profesorado",
    description: "Elimina una ficha de profesorado con su revisión. Sin `confirmar: true` devuelve un aviso; después exige el nombre exacto. Pasa al histórico de 30 días y retira su cuenta del proyecto.",
    inputSchema: {
      proyectoId: projectId,
      profesorId,
      revision,
      confirmar: z.boolean().optional().describe("Llama con true para eliminar tras ver el aviso"),
      nombre: z.string().trim().min(1).max(80).optional().describe("Nombre exacto de la ficha para confirmar la baja"),
    },
    outputSchema: {
      eliminado: z.string().optional(),
      necesitaConfirmacion: z.boolean().optional(),
      herramienta: z.string().optional(),
      proyectoId: z.string().optional(),
      nombre: z.string().optional(),
      revision: z.number().optional(),
      mensaje: z.string().optional(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    handler: eliminarProfesor,
  },
];
