/**
 * Prototipo de miniatura derivada para imágenes de tarea (PER-02, fase 2).
 *
 * No está conectado a la subida: solo demuestra la generación en cliente y
 * sirve de base para la fase 3. Devuelve `null` ante cualquier fallo para que
 * quien lo integre pueda subir el original como respaldo.
 */
import { MINIATURA_MAX_WIDTH, calcularDimensionesMiniatura } from "../../../lib/domain/uploads/thumbnail";

/** Tipos que se pueden reducir; los GIF se dejan intactos para no perder animación. */
export const MINIATURA_TIPOS = ["image/jpeg", "image/png", "image/webp"] as const;

/** Miniatura generada en el navegador. */
export type Miniatura = {
  blob: Blob;
  width: number;
  height: number;
};

/**
 * Genera una miniatura WebP a partir de un archivo de imagen.
 *
 * `createImageBitmap` aplica la orientación EXIF y el canvas descarta los
 * metadatos. Si el navegador no puede decodificar, codificar o no tiene
 * `OffscreenCanvas`, devuelve `null`.
 * @param file - Imagen original elegida por la persona.
 * @param options - Ancho máximo, tipo de salida y calidad.
 * @returns La miniatura o `null` si no se pudo generar.
 */
export async function crearMiniaturaDeArchivo(
  file: File,
  options: { maxWidth?: number; type?: string; quality?: number } = {},
): Promise<Miniatura | null> {
  if (!(MINIATURA_TIPOS as readonly string[]).includes(file.type)) return null;
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return null;
  const maxWidth = options.maxWidth ?? MINIATURA_MAX_WIDTH;
  const type = options.type ?? "image/webp";
  const quality = options.quality ?? 0.8;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const size = calcularDimensionesMiniatura({ width: bitmap.width, height: bitmap.height, maxWidth });
      if (!size) return null;
      const canvas = new OffscreenCanvas(size.width, size.height);
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(bitmap, 0, 0, size.width, size.height);
      const blob = await canvas.convertToBlob({ type, quality });
      if (!blob.size) return null;
      return { blob, width: size.width, height: size.height };
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}
