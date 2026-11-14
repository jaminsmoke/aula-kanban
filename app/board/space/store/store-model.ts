import { GitBranch, GraduationCap, PencilRuler, Puzzle } from "lucide-react";

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

/** Icono de cada categoría del catálogo. */
export const CATEGORY_ICONS = {
  Aula: GraduationCap,
  Pizarras: PencilRuler,
  Programación: Puzzle,
  Diagramas: GitBranch,
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
