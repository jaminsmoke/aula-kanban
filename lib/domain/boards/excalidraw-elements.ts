/**
 * Constructor puro de elementos de Excalidraw para `anadir_a_pizarra`.
 *
 * El agente describe formas simples en español; este módulo completa los
 * campos internos que Excalidraw necesita. No toca `appState` ni `files` y no
 * interpreta la escena: solo añade elementos nuevos al final.
 */

/** Límite de una escena que viaja por el socket (1 MB). */
export const MAX_BOARD_LIVE_BYTES = 1_000_000;
/** Máximo de elementos que se pueden añadir en una llamada. */
export const MAX_ELEMENTOS_ANADIDOS = 50;
/** Longitud máxima de un texto. */
export const MAX_TEXTO_ELEMENTO = 500;
/** Valor absoluto máximo de una coordenada. */
export const MAX_COORDENADA = 100_000;
/** Dimensión máxima de una forma. */
export const MAX_DIMENSION = 100_000;
/** Color de trazo por defecto. */
export const COLOR_POR_DEFECTO = "#1e1e1e";

/** Forma simple que acepta la herramienta MCP. */
export type ElementoPizarra =
  | { tipo: "texto"; texto: string; x: number; y: number; ancho?: number; alto?: number; color?: string }
  | { tipo: "rectangulo" | "elipse" | "flecha"; x: number; y: number; ancho: number; alto: number; color?: string };

/** Elemento completo con los campos internos de Excalidraw. */
export type ElementoExcalidraw = Record<string, unknown> & {
  id: string;
  type: "text" | "rectangle" | "ellipse" | "arrow";
  x: number;
  y: number;
  width: number;
  height: number;
  version: number;
  versionNonce: number;
};

/** Generadores que mantienen puro el constructor. */
export type GeneradoresElementos = {
  generarId: () => string;
  generarNonce: () => number;
  ahora: number;
};

/** Escena JSON de Excalidraw, con campos desconocidos conservados. */
export type EscenaExcalidraw = Record<string, unknown> & {
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};

/**
 * Valida un número finito dentro de un rango.
 * @param valor - Número recibido.
 * @param campo - Nombre del campo para el mensaje.
 * @param minimo - Valor mínimo permitido.
 * @param maximo - Valor máximo permitido.
 * @returns El número validado.
 */
function numero(valor: number, campo: string, minimo: number, maximo: number): number {
  if (!Number.isFinite(valor) || valor < minimo || valor > maximo) throw new Error(`${campo} no es válido.`);
  return valor;
}

/**
 * Valida un color hexadecimal de seis dígitos.
 * @param color - Color opcional.
 * @returns El color o el valor por defecto.
 */
function colorValido(color: string | undefined): string {
  if (color === undefined) return COLOR_POR_DEFECTO;
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("El color no es válido.");
  return color;
}

/**
 * Crea los campos comunes de un elemento.
 * @param tipo - Tipo interno de Excalidraw.
 * @param entrada - Forma simple recibida.
 * @param ancho - Ancho final.
 * @param alto - Alto final.
 * @param generadores - Identificador, nonce y fecha.
 * @returns Los campos comunes del elemento.
 */
function base(
  tipo: ElementoExcalidraw["type"],
  entrada: { x: number; y: number; color?: string },
  ancho: number,
  alto: number,
  generadores: GeneradoresElementos,
) {
  const id = generadores.generarId();
  if (!id) throw new Error("El identificador del elemento no es válido.");
  const nonce = Math.abs(Math.floor(generadores.generarNonce())) || 1;
  return {
    id,
    type: tipo,
    x: numero(entrada.x, "x", -MAX_COORDENADA, MAX_COORDENADA),
    y: numero(entrada.y, "y", -MAX_COORDENADA, MAX_COORDENADA),
    width: ancho,
    height: alto,
    angle: 0,
    strokeColor: colorValido(entrada.color),
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: nonce,
    version: 1,
    versionNonce: nonce,
    isDeleted: false,
    boundElements: null,
    updated: generadores.ahora,
    link: null,
    locked: false,
  };
}

/**
 * Construye un elemento de texto.
 * @param entrada - Texto, posición y tamaño opcional.
 * @param generadores - Identificador, nonce y fecha.
 * @returns El elemento listo para Excalidraw.
 */
function texto(entrada: Extract<ElementoPizarra, { tipo: "texto" }>, generadores: GeneradoresElementos): ElementoExcalidraw {
  const contenido = entrada.texto.trim();
  if (!contenido || contenido.length > MAX_TEXTO_ELEMENTO) throw new Error("El texto no es válido.");
  const fontSize = 20;
  const ancho = numero(entrada.ancho ?? Math.max(80, Math.min(1000, Math.ceil(contenido.length * 12))), "ancho", 1, MAX_DIMENSION);
  const alto = numero(entrada.alto ?? Math.ceil(fontSize * 1.25), "alto", 1, MAX_DIMENSION);
  return {
    ...base("text", entrada, ancho, alto, generadores),
    text: contenido,
    originalText: contenido,
    fontSize,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
    containerId: null,
    autoResize: true,
    lineHeight: 1.25,
  };
}

/**
 * Construye una forma geométrica o una flecha.
 * @param entrada - Forma, posición y tamaño.
 * @param generadores - Identificador, nonce y fecha.
 * @returns El elemento listo para Excalidraw.
 */
function forma(entrada: Exclude<ElementoPizarra, { tipo: "texto" }>, generadores: GeneradoresElementos): ElementoExcalidraw {
  if (entrada.tipo !== "rectangulo" && entrada.tipo !== "elipse" && entrada.tipo !== "flecha") {
    throw new Error("El tipo de elemento no es válido.");
  }
  const ancho = numero(entrada.ancho, "ancho", 1, MAX_DIMENSION);
  const alto = numero(entrada.alto, "alto", 1, MAX_DIMENSION);
  if (entrada.tipo === "rectangulo") {
    return { ...base("rectangle", entrada, ancho, alto, generadores), roundness: { type: 3 } };
  }
  if (entrada.tipo === "elipse") return base("ellipse", entrada, ancho, alto, generadores);
  if (entrada.tipo === "flecha") {
    return {
      ...base("arrow", entrada, ancho, alto, generadores),
      points: [[0, 0], [ancho, alto]],
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: "arrow",
      elbowed: false,
      roundness: { type: 2 },
    };
  }
  throw new Error("El tipo de elemento no es válido.");
}

/**
 * Construye una lista acotada de elementos de Excalidraw.
 * @param entradas - Formas simples recibidas por la herramienta.
 * @param generadores - Identificador, nonce y fecha; se inyectan para mantener la función pura.
 * @returns Los elementos completos, en el mismo orden.
 */
export function construirElementosExcalidraw(
  entradas: readonly ElementoPizarra[],
  generadores: GeneradoresElementos,
): ElementoExcalidraw[] {
  if (entradas.length < 1 || entradas.length > MAX_ELEMENTOS_ANADIDOS) {
    throw new Error("La cantidad de elementos no es válida.");
  }
  return entradas.map((entrada) => entrada.tipo === "texto" ? texto(entrada, generadores) : forma(entrada, generadores));
}

/**
 * Añade elementos a una escena sin tocar `appState` ni `files`.
 * @param escena - Escena existente o vacía.
 * @param elementos - Elementos nuevos.
 * @returns La escena con los elementos al final.
 */
export function agregarElementos(escena: EscenaExcalidraw, elementos: ElementoExcalidraw[]): EscenaExcalidraw {
  const actuales = Array.isArray(escena.elements) ? escena.elements : [];
  return {
    type: "excalidraw",
    version: 2,
    source: "aula-kanban",
    ...escena,
    elements: [...actuales, ...elementos],
    appState: escena.appState ?? {},
    files: escena.files ?? {},
  };
}

/**
 * Interpreta una escena guardada.
 * @param raw - Snapshot serializado, o cadena vacía si aún no existe.
 * @returns La escena o `null` si el JSON no tiene `elements[]`.
 */
export function parseEscena(raw: string): EscenaExcalidraw | null {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (!Array.isArray((parsed as { elements?: unknown }).elements)) return null;
    return parsed as EscenaExcalidraw;
  } catch {
    return null;
  }
}
