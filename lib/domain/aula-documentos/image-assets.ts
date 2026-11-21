/** Imagen raster preparada para las exportaciones Office. */
export type AulaOfficeImage = {
  mime: "image/png" | "image/jpeg" | "image/gif";
  bytes: Uint8Array;
  base64: string;
  dataUrl: string;
  width: number;
  height: number;
};

/** Imagen local resuelta para exportar el documento. */
export type AulaImageAsset = {
  source: string;
  mime: string;
  bytes: Uint8Array;
  base64: string;
  dataUrl: string;
  width: number;
  height: number;
  office?: AulaOfficeImage;
};

/** Imágenes indexadas por su URL interna del documento. */
export type AulaImageAssetMap = ReadonlyMap<string, AulaImageAsset>;

/** Resultado de resolver las imágenes de un documento. */
export type AulaImageLoadResult = {
  assets: AulaImageAssetMap;
  sources: ReadonlyMap<string, string>;
  failed: string[];
  warnings: string[];
};

/** Dimensiones calculadas o de respaldo para una imagen. */
export type AulaImageDimensions = {
  width: number;
  height: number;
};

/**
 * Convierte bytes a base64 sin desbordar la pila con imágenes grandes.
 * @param bytes - Bytes de la imagen.
 * @returns Texto base64.
 */
export function imageBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

/**
 * Decodifica base64 en bytes.
 * @param value - Texto base64.
 * @returns Bytes decodificados.
 */
export function imageBase64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
