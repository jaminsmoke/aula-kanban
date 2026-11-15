/**
 * Reexporta el esquema de URL del tablero desde `lib/domain`, donde vive
 * para que lo compartan la interfaz y el MCP (MCP-01).
 */
export {
  ADMINISTRACION_SECTIONS,
  BOARD_VIEWS,
  CLASS_SECTIONS,
  SETTINGS_SECTIONS,
  buildBoardUrl,
  parseBoardUrl,
  type AdministracionSection,
  type BoardUrlState,
  type BoardView,
  type ClassSection,
  type SettingsSection,
} from "../../../lib/domain/board-url";
