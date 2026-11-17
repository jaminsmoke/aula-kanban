import type { NativeAppId } from "../../../native-apps";
import type { McpToolDefinicion } from "../dominios/tipos";
import { herramientasBlockly } from "./blockly";
import { herramientasExcalidraw } from "./excalidraw";
import { herramientasMermaid } from "./mermaid";
import { herramientasTablaPeriodica } from "./tabla-periodica";

/**
 * Manifiesto MCP de las apps nativas (MCP-05A).
 *
 * Cada app del catálogo debe tener una entrada, aunque todavía no exponga
 * herramientas. El test de cobertura falla si se añade una app a
 * `NATIVE_APP_IDS` sin decidir su superficie MCP.
 */
export type AppMcpDeclaracion = {
  appId: NativeAppId;
  herramientas: McpToolDefinicion[];
  /** Motivo por el que aún no hay herramientas; obligatorio si la lista está vacía. */
  pendiente?: string;
};

/** Declaraciones por app, en el orden del catálogo de Aula Store. */
export const APP_MCP_DECLARACIONES: Record<NativeAppId, AppMcpDeclaracion> = {
  excalidraw: {
    appId: "excalidraw",
    herramientas: herramientasExcalidraw,
  },
  calculadora: {
    appId: "calculadora",
    herramientas: [],
    pendiente: "La calculadora, su memoria y las ecuaciones viven en el navegador y no tienen estado de servidor.",
  },
  "tabla-periodica": {
    appId: "tabla-periodica",
    herramientas: herramientasTablaPeriodica,
  },
  blockly: {
    appId: "blockly",
    herramientas: herramientasBlockly,
  },
  mermaid: {
    appId: "mermaid",
    herramientas: herramientasMermaid,
  },
  ajedrez: {
    appId: "ajedrez",
    herramientas: [],
    pendiente: "El tablero y la partida viven en el navegador y no tienen estado de servidor.",
  },
  tarjetas: {
    appId: "tarjetas",
    herramientas: [],
    pendiente: "Los mazos se guardan en app_documents, pero el repaso y el progreso viven en el navegador; no hay herramientas MCP específicas en esta versión.",
  },
  fisica: {
    appId: "fisica",
    herramientas: [],
    pendiente: "La simulación y las escenas viven en el navegador y no tienen estado de servidor.",
  },
  geometria: {
    appId: "geometria",
    herramientas: [],
    pendiente: "Las construcciones, presets y funciones viven en el navegador y no tienen estado de servidor.",
  },
  mapas: {
    appId: "mapas",
    herramientas: [],
    pendiente: "El mapa se guarda en app_documents, pero la edición, el zoom y la disposición viven en el navegador; no hay herramientas MCP específicas en esta versión.",
  },
  presentaciones: {
    appId: "presentaciones",
    herramientas: [],
    pendiente: "La presentación se guarda en app_documents, pero el editor, la vista previa y el modo presentación viven en el navegador; no hay herramientas MCP específicas en esta versión.",
  },
  moleculas: {
    appId: "moleculas",
    herramientas: [],
    pendiente: "La vista y la selección de moléculas viven en el navegador; no hay un documento persistente ni herramientas MCP específicas en esta versión.",
  },
  timeline: {
    appId: "timeline",
    herramientas: [],
    pendiente: "La línea temporal se guarda en app_documents, pero el lienzo, el zoom y la edición viven en el navegador; no hay herramientas MCP específicas en esta versión.",
  },
  "hoja-calculo": {
    appId: "hoja-calculo",
    herramientas: [],
    pendiente: "La hoja se guarda en app_documents, pero la edición, el cálculo y la exportación CSV viven en el navegador; no hay herramientas MCP específicas en esta versión.",
  },
  documentos: {
    appId: "documentos",
    herramientas: [],
    pendiente: "El documento se guarda en app_documents, pero la edición, los enlaces y la exportación HTML viven en el navegador; no hay herramientas MCP específicas en esta versión.",
  },
};

/** Herramientas de todas las apps, en el orden de sus declaraciones. */
export const herramientasDeApps: McpToolDefinicion[] = Object.values(APP_MCP_DECLARACIONES)
  .flatMap((declaracion) => declaracion.herramientas);
