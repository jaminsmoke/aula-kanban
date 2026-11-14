import type { ComponentType } from "react";
import type { NativeAppMeta, NativeCategory } from "../../../lib/native-apps";
import type { Project } from "../model";

/** Rol del usuario en el proyecto activo. */
export type SpaceRole = Project["role"];

/** Props de icono que acepta cualquier herramienta (lucide o logo real). */
export type SpaceIconProps = {
  /** Tamaño en píxeles del icono. */
  size?: number;
  /** Grosor de trazo (los lucide lo usan; los logos lo ignoran). */
  strokeWidth?: number;
  /** Clases CSS opcionales. */
  className?: string;
};

/** Categorías del catálogo de apps nativas. */
export type SpaceCategory = NativeCategory;

/**
 * Ficha de una app tal como la consume la interfaz: los metadatos del
 * catálogo compartido más su icono y los roles que pueden verla.
 */
export type SpaceTool = Omit<NativeAppMeta, "id"> & {
  id: string;
  icon: ComponentType<SpaceIconProps>;
  /** Roles que la ven; "admin" incluye a owner y admin (ven todas). */
  roles: SpaceRole[];
};
