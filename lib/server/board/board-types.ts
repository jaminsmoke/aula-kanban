/**
 * Contrato del dueño de una pizarra.
 *
 * Vive en un módulo neutral para que el servicio y su repositorio compartan
 * el tipo sin importarse entre sí. `boards.ts` lo reexporta para conservar
 * la API pública existente.
 */

/** Tipos de dueño de una pizarra. */
export const BOARD_OWNER_TYPES = ["task", "project", "space"] as const;

/** Tipo de dueño de una pizarra. */
export type BoardOwnerType = (typeof BOARD_OWNER_TYPES)[number];
