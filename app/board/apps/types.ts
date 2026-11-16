import type { ComponentType } from "react";
import type { NativeAppMeta, NativeCategory, StoreTopCategory, SubCategory } from "../../../lib/native-apps";
import type { Project } from "../shared/model";

/** Rol del usuario en el proyecto activo. */
export type StoreRole = Project["role"];

/** Props de icono que acepta cualquier herramienta (lucide o logo real). */
export type StoreIconProps = {
  /** Tamaño en píxeles del icono. */
  size?: number;
  /** Grosor de trazo (los lucide lo usan; los logos lo ignoran). */
  strokeWidth?: number;
  /** Clases CSS opcionales. */
  className?: string;
};

/** Categorías del catálogo de apps nativas. */
export type StoreCategory = NativeCategory;

/** Categorías principales por familia de uso (STORE-03A). */
export type { StoreTopCategory, SubCategory };

/**
 * Ficha de una app tal como la consume la interfaz: los metadatos del
 * catálogo compartido más su icono y los roles que pueden verla.
 */
export type StoreTool = Omit<NativeAppMeta, "id"> & {
  id: string;
  icon: ComponentType<StoreIconProps>;
  /** Roles que la ven; "admin" incluye a owner y admin (ven todas). */
  roles: StoreRole[];
};
