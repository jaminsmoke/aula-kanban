/**
 * Protocolo de escritorio en vivo de Tienda (Fase 2 del roadmap de
 * MCP-04).
 *
 * El escritorio es **efímero por pestaña**: las ventanas abiertas viven en la
 * memoria de React de cada pestaña y el resto del equipo no las ve. El
 * channel `space` solo conserva las sesiones conectadas y su estado en
 * memoria del Durable Object — no hay tabla nueva ni escritorio persistido.
 * Las herramientas MCP actúan sobre las pestañas conectadas de la propia
 * cuenta, nunca sobre las de otro miembro.
 */

/** Estado vivo de una ventana de la app indicada. */
export type VentanaEstado = {
  appId: string;
  abierta: boolean;
  minimizada: boolean;
  ampliada: boolean;
};

/** Acciones que las herramientas pueden enviar a una pestaña conectada. */
export type AccionVentana = "abrir" | "cerrar" | "minimizar" | "restaurar" | "ampliar";

/** Mensaje del cliente al DO: estado actual de sus ventanas. */
export type MensajeEstado = { type: "estado"; ventanas: VentanaEstado[] };

/** Mensaje del DO al cliente: comando de control de una ventana. */
export type ComandoVentana = { type: "comando"; accion: AccionVentana; appId: string };

/** Una pestaña no puede tener más ventanas abiertas que apps instaladas. */
export const MAX_VENTANAS = 4;

/**
 * Saneado de una lista de ventanas recibida por el canal.
 * @param value - Valor desconocido del mensaje.
 * @returns La lista saneada o `null` si el valor no es válido.
 */
export function validarVentanas(value: unknown): VentanaEstado[] | null {
  if (!Array.isArray(value) || value.length > MAX_VENTANAS) return null;
  const ventanas: VentanaEstado[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    if (typeof record.appId !== "string" || record.appId.length < 1 || record.appId.length > 80) return null;
    if ([record.abierta, record.minimizada, record.ampliada].some((field) => typeof field !== "boolean")) return null;
    ventanas.push({ appId: record.appId, abierta: record.abierta as boolean, minimizada: record.minimizada as boolean, ampliada: record.ampliada as boolean });
  }
  return ventanas;
}
