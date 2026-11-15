import { env } from "cloudflare:workers";
import type { AccionVentana, VentanaEstado } from "../domain/space-windows";
import type { SpaceRoom } from "./space-room";

/**
 * Acceso al canal en vivo de Mi espacio desde el servidor (Fase 2 de
 * MCP-04): un Durable Object `SpaceRoom` por proyecto. Sin binding (tests,
 * despliegues sin DO) se comporta como «sin pestañas conectadas»: las
 * herramientas devuelven el enlace del paso A en vez de fallar.
 */

/** Resultado de un comando de ventana. */
export type ComandoResultado = {
  /** Si la cuenta tiene al menos una pestaña conectada. */
  conectada: boolean;
  /** Si alguna pestaña recibió el comando. */
  entregada: boolean;
};

/**
 * Stub de la sala de un proyecto, o `null` sin binding.
 * @param projectId - Proyecto de la sala.
 * @returns El stub de la sala o `null` si no hay binding.
 */
function sala(projectId: string): DurableObjectStub<SpaceRoom> | null {
  return env.SPACE_ROOMS ? (env.SPACE_ROOMS.getByName(projectId) as DurableObjectStub<SpaceRoom>) : null;
}

/**
 * Estado de ventanas de las pestañas conectadas de una cuenta.
 * @param projectId - Proyecto de la sala.
 * @param userId - Cuenta cuyas pestañas se consultan.
 * @returns Las ventanas publicadas o `null` si no hay pestaña conectada.
 */
export async function ventanasDe(projectId: string, userId: string): Promise<VentanaEstado[] | null> {
  const stub = sala(projectId);
  if (!stub) return null;
  return stub.estadoDe(userId);
}

/**
 * Busca si la cuenta tiene una pestaña conectada.
 * @param projectId - Proyecto de la sala.
 * @param userId - Cuenta cuyas pestañas se consultan.
 * @returns `true` si hay pestaña conectada.
 */
export async function hayPestana(projectId: string, userId: string): Promise<boolean> {
  return (await ventanasDe(projectId, userId)) !== null;
}

/**
 * Envía un comando de ventana a las pestañas conectadas de una cuenta.
 * @param projectId - Proyecto de la sala.
 * @param userId - Cuenta destinataria (sus propias pestañas).
 * @param accion - Acción de control.
 * @param appId - App sobre la que actúa el comando.
 * @returns Si había pestaña conectada y si el comando se entregó.
 */
export async function comandarVentana(projectId: string, userId: string, accion: AccionVentana, appId: string): Promise<ComandoResultado> {
  const stub = sala(projectId);
  if (!stub) return { conectada: false, entregada: false };
  const entregada = await stub.comandoA(userId, accion, appId);
  return { conectada: entregada || (await hayPestana(projectId, userId)), entregada };
}
