/**
 * Punto de entrada del catálogo de apps de Mi espacio. Las fichas viven en
 * `apps/registry.tsx` y los metadatos compartidos con el servidor en
 * `lib/native-apps.ts`; aquí solo se re-exportan para no romper imports.
 */
export type { SpaceCategory, SpaceIconProps, SpaceRole, SpaceTool } from "../apps/types";
export { SPACE_CATEGORIES } from "../../../lib/native-apps";
export { spaceTools, toolApps, toolWindow, visibleTools } from "../apps/registry";
