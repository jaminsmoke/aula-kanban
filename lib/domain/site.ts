/** URL pública de esta instancia; se usa si el despliegue no configura otra. */
export const DEFAULT_SITE_URL = "https://aula-kanban.doubleoak32.chatgpt.site";

/** Nombre visible de la aplicación en metadatos y tarjetas sociales. */
export const SITE_NAME = "Aula Kanban";

/** Descripción compartida por la página y sus tarjetas sociales. */
export const SITE_DESCRIPTION = "Tablero colaborativo de tareas para el grupo de clase.";

/** Imagen social común de la instancia. */
export const SOCIAL_IMAGE = {
  path: "/og/aula-kanban.png",
  width: 1200,
  height: 630,
  alt: "Aula Kanban: tablero colaborativo para el grupo de clase",
} as const;

/**
 * Resuelve la URL pública del Site a partir de `NEXT_PUBLIC_SITE_URL`.
 * Solo acepta HTTP/HTTPS y conserva el origen, sin ruta ni barra final.
 * Un valor ausente, vacío o inválido cae en `DEFAULT_SITE_URL` para que el
 * Site actual siga funcionando sin configuración adicional.
 * @param value - Valor configurado; por defecto, la variable de entorno.
 * @returns La URL pública normalizada.
 */
export function resolveSiteUrl(value = process.env.NEXT_PUBLIC_SITE_URL): URL {
  const candidate = value?.trim();
  if (candidate) {
    try {
      const url = new URL(candidate);
      if ((url.protocol === "https:" || url.protocol === "http:") && url.host) {
        return new URL(url.origin);
      }
    } catch {
      // Un valor inválido no debe romper el arranque ni los metadatos.
    }
  }
  return new URL(DEFAULT_SITE_URL);
}

/** URL canónica de la instancia, resuelta una vez al cargar el módulo. */
export const siteUrl = resolveSiteUrl();
