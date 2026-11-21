import type { ReactNode } from "react";

/** Espera antes de guardar automáticamente tras una edición. */
export const AUTOSAVE_DELAY_MS = 1_600;

export type ToolbarAction = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

export type ToolbarState = {
  paragraph: boolean;
  heading1: boolean;
  heading2: boolean;
  heading3: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  bulletList: boolean;
  orderedList: boolean;
  taskList: boolean;
  blockquote: boolean;
  code: boolean;
  codeBlock: boolean;
  link: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  alignJustify: boolean;
  canLink: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

export const EMPTY_TOOLBAR_STATE: ToolbarState = {
  paragraph: false,
  heading1: false,
  heading2: false,
  heading3: false,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  bulletList: false,
  orderedList: false,
  taskList: false,
  blockquote: false,
  code: false,
  codeBlock: false,
  link: false,
  alignLeft: false,
  alignCenter: false,
  alignRight: false,
  alignJustify: false,
  canLink: false,
  canUndo: false,
  canRedo: false,
};

export type SaveConflict = {
  updatedAt: number | null;
  keepConfirm: boolean;
};
