import { readFileSync } from "node:fs";
import { join } from "node:path";

const STYLES = ["layout.css", "editor.css", "blocks.css", "dialogs.css", "sidebar.css"];

/** Lee y concatena los estilos divididos de Aula Documentos para las pruebas. */
export const AULA_DOCUMENTOS_CSS = STYLES
  .map((file) => readFileSync(join(process.cwd(), "app", "board", "apps", "aula-documentos", "styles", file), "utf8"))
  .join("\n");
