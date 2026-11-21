import type { OfficeFileInfo } from "../../../../../../../lib/domain/aula-documentos/office-model";

/** Archivo validado y sus bytes en memoria. */
export type LoadedOfficeFile = {
  info: OfficeFileInfo;
  bytes: ArrayBuffer;
  id: number;
};

/** Posición actual dentro del documento. */
export type ViewerPosition = {
  label: "Página" | "Diapositiva" | "Hoja";
  current: number;
  total: number;
};

/** Acciones que expone el controlador del visor activo. */
export type ViewerControls = {
  destroy: () => void;
  zoomIn: () => void | Promise<void>;
  zoomOut: () => void | Promise<void>;
  fitWidth: () => void | Promise<void>;
  fitPage: () => void | Promise<void>;
  previous?: () => void | Promise<void>;
  next?: () => void | Promise<void>;
};
