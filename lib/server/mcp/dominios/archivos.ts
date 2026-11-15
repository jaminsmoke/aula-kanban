import { z } from "zod";
import {
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  StorageUnavailableError,
  findUpload,
  storeUpload,
  uploadPurposes,
  validateUpload,
  type UploadPurpose,
} from "../../storage";
import { errorHerramienta, falloResolucion, payloadResult, resolve, toChatGPTUser, type McpCaller } from "../contexto";
import type { McpToolDefinicion } from "./tipos";

/**
 * Dominio de archivos del proyecto (MCP-10): subida por base64 y consulta de
 * metadatos. Reutiliza `storeUpload`/`validateUpload` de la web, de modo que
 * tipos, límites y disponibilidad de R2 son los mismos. La descarga sigue
 * siendo de `/api/files/[id]`; el MCP no devuelve binarios.
 */

const GUEST_ERROR = "Las cuentas invitadas solo pueden consultar el proyecto.";
const STORAGE_ERROR = "La subida de archivos aún no está habilitada en este despliegue. Usa una URL externa de momento.";
const MAX_BASE64_CHARS = Math.ceil((MAX_DOCUMENT_BYTES * 4) / 3) + 4;

type UploadArgs = {
  proyectoId: string;
  finalidad: UploadPurpose;
  nombre: string;
  tipoMime: string;
  contenidoBase64: string;
};

type FileArgs = { proyectoId: string; archivoId: string };

/**
 * Decodifica base64 estándar, con o sin relleno, y rechaza contenido inválido.
 * @param value - Contenido base64 recibido.
 * @returns Los bytes o `null` si la cadena no es base64 válida.
 */
function decodeBase64(value: string): Uint8Array | null {
  const compact = value.replace(/\s+/g, "");
  if (!compact || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return null;
  const padded = compact.padEnd(Math.ceil(compact.length / 4) * 4, "=");
  if (padded.length % 4 !== 0) return null;
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * Enlace absoluto al fichero, usando el origen de la puerta si lo hay.
 * @param origen - Origen del Site o `undefined`.
 * @param url - Ruta interna del fichero.
 * @returns La URL del fichero.
 */
function enlaceArchivo(origen: string | undefined, url: string): string {
  return origen ? `${origen}${url}` : url;
}

/**
 * Metadatos públicos de una fila de `uploads`.
 * @param row - Fila de la base de datos.
 * @param origen - Origen del Site para el enlace.
 * @returns Los metadatos que consume el cliente MCP.
 */
function archivoDe(row: { id: string; projectId: string; url: string; mimeType: string; sizeBytes: number; purpose: string; createdAt: number }, origen: string | undefined) {
  return {
    id: row.id,
    proyectoId: row.projectId,
    tipoMime: row.mimeType,
    tamanoBytes: row.sizeBytes,
    finalidad: row.purpose,
    creado: row.createdAt,
    enlace: enlaceArchivo(origen, row.url),
  };
}

async function subirArchivo(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as UploadArgs;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  if (resolved.access.role === "guest") return errorHerramienta("forbidden", GUEST_ERROR);

  const bytes = decodeBase64(a.contenidoBase64);
  if (!bytes) return errorHerramienta("invalid", "El contenido base64 no es válido.");
  if (bytes.byteLength === 0) return errorHerramienta("invalid", "El archivo está vacío.");

  const max = a.finalidad === "document" ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
  if (bytes.byteLength > max) {
    return errorHerramienta("too_large", a.finalidad === "document" ? "El documento supera los 10 MB permitidos." : "La imagen supera los 5 MB permitidos.");
  }
  const problem = validateUpload(a.finalidad, a.tipoMime, bytes.byteLength);
  if (problem) return errorHerramienta("invalid", problem);

  try {
    const file = new File([bytes.buffer as ArrayBuffer], a.nombre, { type: a.tipoMime });
    const stored = await storeUpload({ projectId: a.proyectoId, purpose: a.finalidad, file, ownerUserId: caller.userId });
    const row = await findUpload(stored.id);
    return payloadResult({
      archivo: row
        ? archivoDe(row, caller.origen)
        : { id: stored.id, proyectoId: a.proyectoId, tipoMime: a.tipoMime, tamanoBytes: bytes.byteLength, finalidad: a.finalidad, enlace: enlaceArchivo(caller.origen, stored.url) },
    });
  } catch (error) {
    if (error instanceof StorageUnavailableError) return errorHerramienta("unavailable", STORAGE_ERROR);
    throw error;
  }
}

async function obtenerArchivo(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as FileArgs;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const row = await findUpload(a.archivoId);
  if (!row || row.projectId !== a.proyectoId) return errorHerramienta("not_found", "Archivo no encontrado.");
  return payloadResult({ archivo: archivoDe(row, caller.origen) });
}

const finalidad = z.enum(uploadPurposes).describe("Finalidad de la subida: task-image, board-asset o document");

/** Herramientas del dominio de archivos. */
export const herramientasArchivos: McpToolDefinicion[] = [
  {
    name: "subir_archivo",
    title: "Subir archivo",
    description: "Sube un archivo al proyecto y devuelve sus metadatos y su enlace. Acepta imágenes PNG/JPEG/WebP/GIF para tareas o pizarras, y PDF, texto, Markdown, CSV o imágenes como documento. Las cuentas invitadas no escriben.",
    inputSchema: {
      proyectoId: z.string().uuid().describe("Id del proyecto de Aula Kanban"),
      finalidad,
      nombre: z.string().trim().min(1).max(255).describe("Nombre del archivo, con su extensión"),
      tipoMime: z.string().trim().min(1).max(100).describe("Tipo MIME real del archivo"),
      contenidoBase64: z.string().min(1).max(MAX_BASE64_CHARS).describe("Contenido del archivo codificado en base64"),
    },
    outputSchema: { archivo: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: subirArchivo,
  },
  {
    name: "obtener_archivo",
    title: "Obtener archivo",
    description: "Devuelve los metadatos y el enlace de un archivo del proyecto, sin descargar su contenido binario.",
    inputSchema: {
      proyectoId: z.string().uuid().describe("Id del proyecto de Aula Kanban"),
      archivoId: z.string().min(1).max(80).describe("Id del archivo subido"),
    },
    outputSchema: { archivo: z.record(z.unknown()) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: obtenerArchivo,
  },
];
