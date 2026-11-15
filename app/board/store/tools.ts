/**
 * Punto de entrada del catálogo de apps de Tienda. Las fichas viven en
 * `apps/registry.tsx` y los metadatos compartidos con el servidor en
 * `lib/native-apps.ts`; aquí solo se re-exportan para no romper imports.
 */
export type { StoreCategory, StoreIconProps, StoreRole, StoreTool } from "../apps/types";
export { AULA_STORE_VERSION, STORE_CATEGORIES } from "../../../lib/native-apps";
export { storeTools, toolApps, toolWindow, visibleTools } from "../apps/registry";
