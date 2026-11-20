import { findMember, inviteMember, listMembers, removeMember } from "../../../access/members";
import { errorHerramienta, falloResolucion, payloadResult, resolve, toChatGPTUser, type McpCaller } from "../../contexto";
import { falloFicha, miembro } from "./comun";

/**
 * Lista los miembros e invitaciones del proyecto sin exponer el userId.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto solicitado.
 * @returns Los miembros visibles o el error del contrato.
 */
export async function listarMiembros(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId } = args as { proyectoId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const result = await listMembers(proyectoId, resolved.access);
  if (!result.ok) return errorHerramienta(result.status === 403 ? "forbidden" : "error", result.message);
  return payloadResult({ miembros: result.miembros.map(miembro) });
}

type Invitacion = { proyectoId: string; correo: string; rol: "teacher" | "student" | "guest"; seccion?: string; profesorId?: string };

/**
 * Crea o actualiza una invitación pendiente.
 * @param caller - Cuenta identificada por el token.
 * @param args - Correo, rol y ficha asociada.
 * @returns La invitación creada o actualizada.
 */
export async function invitarMiembro(caller: McpCaller, args: Record<string, unknown>) {
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

/**
 * Retira el acceso de una cuenta o una invitación del proyecto.
 * @param caller - Cuenta identificada por el token.
 * @param args - Miembro y confirmación.
 * @returns El aviso de confirmación o el identificador retirado.
 */
export async function retirarMiembro(caller: McpCaller, args: Record<string, unknown>) {
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
