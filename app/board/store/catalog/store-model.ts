import { Briefcase, GraduationCap, Puzzle } from "lucide-react";

/** Estado de una aplicación nativa tal como lo devuelve la API. */
export type StoreApp = {
  /** Identificador en el catálogo. */
  id: string;
  /** Estado: instalada, detenida, no instalada, en curso o error. */
  status: string;
  /** URL pública de la instancia, si está instalada. */
  url: string | null;
  /** Versión de la aplicación, si se conoce. */
  version?: string | null;
};

/** Acciones de gestión disponibles en la tienda. */
export type StoreAction = "install" | "uninstall";

/**
 * Aplicaciones destacadas de «Mejores aplicaciones», en orden editorial.
 * Con el catálogo actual todas las apps lo son; al crecer, curar la lista.
 */
export const FEATURED_APP_IDS = ["excalidraw", "calculadora", "tabla-periodica", "blockly", "mermaid", "ajedrez"] as const;

/** Icono de cada categoría principal del catálogo (STORE-03A). */
export const CATEGORY_ICONS = {
  Educación: GraduationCap,
  Oficina: Briefcase,
  Productividad: Puzzle,
} as const;

/** Metadatos visuales de cada estado de instalación. */
export const STATUS_META: Record<string, { label: string; className: string }> = {
  installed: { label: "Instalada", className: "store-chip--installed" },
  stopped: { label: "Detenida", className: "store-chip--stopped" },
  not_installed: { label: "No instalada", className: "store-chip--pending" },
  working: { label: "Procesando…", className: "store-chip--working" },
  error: { label: "Error", className: "store-chip--error" },
};

/**
 * Etiqueta legible de un estado de aplicación.
 * @param status - Estado bruto de la aplicación.
 * @returns La etiqueta para mostrar.
 */
export function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status;
}
