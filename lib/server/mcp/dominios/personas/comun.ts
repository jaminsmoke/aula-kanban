import { z } from "zod";
import type { Member } from "../../../members";
import type { StudentFicha } from "../../../people/students";
import type { TeacherFicha } from "../../../people/teachers";
import { errorHerramienta, payloadResult, type ToolResult } from "../../contexto";

/** Schemas y helpers compartidos por las herramientas de personas. */

export const projectId = z.string().uuid().describe("Id del proyecto de Aula Kanban");
export const seccion = z.string().min(1).max(80).describe("Sección de la ficha de alumnado");
export const profesorId = z.string().min(1).max(80).describe("Id de la ficha de profesorado");
export const revision = z.number().int().positive().describe("Revisión leída antes de editar");
export const nombre = z.string().trim().min(1).max(80).describe("Nombre de la ficha");
export const nombreVisible = z.string().trim().max(80).optional().describe("Nombre visible; por defecto, el nombre");
export const rol = z.string().trim().max(500).optional().describe("Rol o nota de la ficha");
export const actividad = z.string().trim().max(2000).optional().describe("Actividad de la ficha");
export const ayudaIA = z.string().trim().max(2000).optional().describe("Ayuda de IA de la ficha");
export const correoCuenta = z.string().trim().max(254).optional().describe("Correo que crea la invitación pendiente");
export const fichaEditable = { nombre: nombre.optional(), nombreVisible, rol, actividad, ayudaIA, correoCuenta };

/**
 * Ficha de alumnado en el contrato: nombres en español y campos estables.
 * @param ficha - Ficha leída de la base con su estado de cuenta.
 * @returns La ficha para `structuredContent`.
 */
export function alumno(ficha: StudentFicha) {
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
export function profesor(ficha: TeacherFicha) {
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
export function miembro(member: Member) {
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
export function falloFicha(result: { status: number; message: string }): ToolResult {
  const codigo = result.status === 400 ? "invalid" : result.status === 403 ? "forbidden" : result.status === 404 ? "not_found" : result.status === 409 ? "conflict" : result.status === 503 ? "unavailable" : "error";
  return errorHerramienta(codigo, result.message);
}

/**
 * Texto del aviso previo a una baja, igual en alumnado y profesorado.
 * @param herramienta - Nombre de la herramienta que pide confirmación.
 * @param proyectoId - Proyecto de la ficha.
 * @param nombre - Nombre exacto de la ficha.
 * @param revision - Revisión leída de la ficha.
 * @returns El resultado con el aviso y sin borrar nada.
 */
export function avisoBaja(herramienta: string, proyectoId: string, nombre: string, revision: number) {
  return payloadResult({
    necesitaConfirmacion: true,
    herramienta,
    proyectoId,
    nombre,
    revision,
    mensaje: "Esta acción eliminará la ficha y retirará su cuenta del proyecto; pasará al histórico de 30 días. Llama de nuevo con confirmar: true y el nombre exacto para continuar.",
  });
}
