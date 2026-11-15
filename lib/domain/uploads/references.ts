/**
 * Extracción de referencias a archivos subidos.
 *
 * Las apps guardan la URL interna `/api/files/{id}` dentro de campos de texto
 * y de documentos JSON. Este módulo no interpreta el contenido: solo recoge
 * los identificadores, ignora las URLs externas y trata un JSON ilegible como
 * un fallo cerrado.
 */

/** Profundidad máxima al recorrer un documento JSON. */
export const MAX_REFERENCE_DEPTH = 64;

/**
 * Patrón de una URL interna. El lookbehind evita contar una URL absoluta
 * (`https://host/api/files/id`) o un fragmento pegado a otra ruta.
 */
const FILE_ID_PATTERN = String.raw`(?<![\w./:-])\/api\/files\/([A-Za-z0-9_-]+)`;

/**
 * Extrae los identificadores de las URLs internas de un texto, sin repetir.
 * @param texto - Texto libre, campo de una fila o cadena de un JSON.
 * @returns Los identificadores en orden de aparición.
 */
export function idsDeArchivo(texto: string): string[] {
  if (!texto) return [];
  const patron = new RegExp(FILE_ID_PATTERN, "g");
  const ids: string[] = [];
  const vistos = new Set<string>();
  for (const match of texto.matchAll(patron)) {
    const id = match[1];
    if (vistos.has(id)) continue;
    vistos.add(id);
    ids.push(id);
  }
  return ids;
}

/**
 * Recorre un valor JSON y recoge las referencias de todas sus cadenas.
 * @param valor - Valor ya interpretado.
 * @param profundidad - Nivel actual del recorrido.
 * @param ids - Acumulador interno de identificadores.
 * @returns Los identificadores encontrados.
 */
function recorrer(valor: unknown, profundidad: number, ids: Set<string>): void {
  if (profundidad > MAX_REFERENCE_DEPTH) return;
  if (typeof valor === "string") {
    for (const id of idsDeArchivo(valor)) ids.add(id);
    return;
  }
  if (Array.isArray(valor)) {
    for (const item of valor) recorrer(item, profundidad + 1, ids);
    return;
  }
  if (valor && typeof valor === "object") {
    for (const item of Object.values(valor)) recorrer(item, profundidad + 1, ids);
  }
}

/**
 * Extrae las referencias de un valor JSON ya interpretado.
 * @param valor - Valor recibido de un documento.
 * @returns Los identificadores únicos en orden de aparición.
 */
export function referenciasDeJson(valor: unknown): string[] {
  const ids = new Set<string>();
  recorrer(valor, 0, ids);
  return [...ids];
}

/**
 * Interpreta un documento JSON y extrae sus referencias.
 * @param raw - Texto guardado en `boards.snapshot` o `app_documents.state`.
 * @returns Los identificadores, o `null` si el JSON no se puede interpretar.
 */
export function referenciasDeDocumento(raw: string): string[] | null {
  if (!raw.trim()) return [];
  try {
    return referenciasDeJson(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
