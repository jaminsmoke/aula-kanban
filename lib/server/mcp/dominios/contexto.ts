import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { instanceApps, students, tasks as taskRows, teachers, userIdentities } from "../../../../db/schema";
import { BOARD_VIEWS, type BoardView, type ClassSection, type SettingsSection } from "../../../domain/board-url";
import { NATIVE_APP_IDS } from "../../../native-apps";
import { listInstalledApps } from "../../apps";
import { comandarVentana } from "../../space-control";
import { isAdministrator, isOwner } from "../../project-access";
import { listVisibleProjects } from "../../projects";
import { decorate, projectData } from "../../tasks/queries";
import { errorHerramienta, falloResolucion, payloadResult, resolve, toChatGPTUser, type McpCaller } from "../contexto";
import { UI_APERTURA_URI } from "../ui-apertura";
import { enlace } from "../enlaces";
import type { McpToolDefinicion } from "./tipos";

/**
 * Dominio de contexto de la cuenta (MCP-01): quién es el llamante, en qué
 * vista abrir un proyecto y un resumen de su estado. Los enlaces se
 * construyen desde el esquema compartido de `lib/domain/board-url` y son
 * absolutos con el origen de la petición.
 */

const projectId = z.string().uuid().describe("Id del proyecto de Aula Kanban");

const vistas = z.enum(BOARD_VIEWS as unknown as [BoardView, ...BoardView[]]).describe("Vista pedida");
const seccionClase = z.enum(["tareas", "calendario"]).describe("Sección dentro de Clase");
const seccionAjustes = z.enum(["cuenta", "apariencia", "administradores"]).describe("Sección dentro de Ajustes");

/**
 * Nombre visible de la cuenta: identidad guardada o el correo.
 * @param userId - Identificador estable de la cuenta.
 * @param email - Correo de la cuenta.
 * @returns El nombre visible.
 */
async function displayNameOf(userId: string, email: string): Promise<string> {
  try {
    const [identity] = await getDb().select().from(userIdentities).where(eq(userIdentities.id, userId));
    return identity?.displayName || email;
  } catch {
    return email;
  }
}

async function quienSoy(caller: McpCaller) {
  const user = toChatGPTUser(caller);
  const [nombre, esPropietario, esAdministrador, visibles] = await Promise.all([
    displayNameOf(caller.userId, caller.email),
    isOwner(user),
    isAdministrator(user),
    listVisibleProjects(user),
  ]);
  return payloadResult({
    nombre,
    correo: caller.email,
    esPropietario,
    esAdministrador,
    proyectos: visibles.map(({ project, access }) => ({
      id: project.id,
      nombre: project.name,
      rol: access.role,
      seccionAlumno: access.studentSection,
      profesorId: access.teacherId,
    })),
  });
}

type EnlaceArgs = {
  proyectoId: string;
  vista?: BoardView;
  seccion?: string;
  app?: string;
};

async function obtenerEnlace(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as EnlaceArgs;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const view = (a.vista ?? "clase") as BoardView;
  const classSection = (view === "clase" && (a.seccion === "calendario" || a.seccion === "tareas") ? a.seccion : "tareas") as ClassSection;
  const settingsSection = (view === "ajustes" && (a.seccion === "administradores" || a.seccion === "apariencia" || a.seccion === "cuenta") ? a.seccion : "cuenta") as SettingsSection;
  return payloadResult({ enlace: enlace(caller.origen, a.proyectoId, view, classSection, settingsSection, a.app) });
}

/**
 * Abrir la app indicada en Mi espacio (MCP-04, Paso A): devuelve el enlace
 * profundo `view=espacio&app=<appId>` para mandarlo al usuario. Falla con
 * `not_found` si la app no está instalada: el enlace no abriría nada.
 * @param caller - Cuenta identificada por el token.
 * @param args - `{ proyectoId, appId }`.
 * @returns El resultado con el enlace o el error del contrato.
 */
async function abrirApp(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId, appId } = args as { proyectoId: string; appId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const instalada = (await listInstalledApps()).some((estado) => estado.id === appId && estado.status === "installed");
  if (!instalada) return errorHerramienta("not_found", "La aplicación no está instalada");
  const resultado = await comandarVentana(proyectoId, caller.userId, "abrir", appId as string);
  return payloadResult({
    enlace: enlace(caller.origen, proyectoId, "espacio", "tareas", "cuenta", appId as string),
    ventana_conectada: resultado.conectada,
    ventana_entregada: resultado.entregada,
  });
}

async function obtenerResumen(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId } = args as { proyectoId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const db = getDb();
  const [data, taskList, studentRows, teacherRows, apps] = await Promise.all([
    projectData(proyectoId),
    db.select().from(taskRows).where(eq(taskRows.projectId, proyectoId)).orderBy(asc(taskRows.createdAt)),
    db.select().from(students).where(and(eq(students.projectId, proyectoId), eq(students.deleted, 0))),
    db.select().from(teachers).where(eq(teachers.projectId, proyectoId)),
    db.select().from(instanceApps).where(eq(instanceApps.installed, 1)),
  ]);
  const tareas = taskList.map((row) => decorate(row, data));
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  const hoyIso = `${yyyy}-${mm}-${dd}`;
  const diaSemana = (hoy.getDay() + 6) % 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - diaSemana);
  const domingo = new Date(hoy);
  domingo.setDate(hoy.getDate() + (6 - diaSemana));
  const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const inicioSemana = isoDe(lunes);
  const finSemana = isoDe(domingo);
  const porEstado = { pending: 0, active: 0, review: 0, done: 0 } as Record<string, number>;
  let vencidas = 0;
  let deEstaSemana = 0;
  for (const task of tareas) {
    porEstado[task.status] = (porEstado[task.status] ?? 0) + 1;
    if (task.dueDate) {
      if (task.dueDate < hoyIso && task.status !== "done") vencidas += 1;
      if (task.dueDate >= inicioSemana && task.dueDate <= finSemana) deEstaSemana += 1;
    }
  }
  return payloadResult({
    proyectoId,
    tareas: { total: tareas.length, porEstado, vencidas, deEstaSemana },
    personas: { alumnos: studentRows.length, profesores: teacherRows.length },
    apps: apps.map((app) => app.appId),
    enlaces: {
      clase: enlace(caller.origen, proyectoId, "clase", "tareas"),
      calendario: enlace(caller.origen, proyectoId, "clase", "calendario"),
    },
  });
}

/** Herramientas del dominio de contexto de la cuenta. */
export const herramientasContexto: McpToolDefinicion[] = [
  {
    name: "quien_soy",
    title: "Quién soy",
    description: "Identifica la cuenta del token: nombre, correo, si es propietaria o administradora y sus proyectos con rol y ficha vinculada. Llamar primero antes de operar.",
    inputSchema: {},
    outputSchema: {
      nombre: z.string(),
      correo: z.string(),
      esPropietario: z.boolean(),
      esAdministrador: z.boolean(),
      proyectos: z.array(z.record(z.unknown())),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: quienSoy,
  },
  {
    name: "obtener_enlace",
    title: "Obtener enlace",
    description: "Devuelve la URL absoluta canónica del Site para una vista y sección de un proyecto accesible, para mandarla al usuario.",
    inputSchema: {
      proyectoId: projectId,
      vista: vistas.optional(),
      seccion: seccionClase.or(seccionAjustes).optional().describe("Sección dentro de la vista (clase o ajustes)"),
      app: z.string().min(1).max(80).optional().describe("App de Mi espacio a abrir en la vista espacio"),
    },
    outputSchema: { enlace: z.string() },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: obtenerEnlace,
  },
  {
    name: "abrir_app",
    title: "Abrir app",
    description: "Devuelve la URL absoluta de Mi espacio con la app indicada abierta (paso A de MCP-04). Falla con not_found si la app no está instalada.",
    inputSchema: {
      proyectoId: projectId,
      appId: z.enum(NATIVE_APP_IDS as unknown as [string, ...string[]]).describe("App de Mi espacio a abrir"),
    },
    outputSchema: { enlace: z.string(), ventana_conectada: z.boolean(), ventana_entregada: z.boolean() },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: UI_APERTURA_URI } },
    handler: abrirApp,
  },
  {
    name: "obtener_resumen_proyecto",
    title: "Resumen del proyecto",
    description: "Resumen de un proyecto: tareas por estado, vencidas y de esta semana, alumnos y profesores, apps instaladas y enlaces.",
    inputSchema: { proyectoId: projectId },
    outputSchema: {
      proyectoId: z.string(),
      tareas: z.record(z.unknown()),
      personas: z.record(z.unknown()),
      apps: z.array(z.string()),
      enlaces: z.record(z.unknown()),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: obtenerResumen,
  },
];
