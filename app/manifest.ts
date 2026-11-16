import type { MetadataRoute } from "next";

/**
 * Manifest de la aplicación instalable. Se sirve en `/manifest.webmanifest`
 * (no en `/manifest.json`) y usa los colores de marca del sistema visual.
 * @returns El manifest que vinext publica para el navegador.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aula Kanban",
    short_name: "Aula Kanban",
    description: "Tablero colaborativo de tareas para el grupo de clase.",
    start_url: "/",
    display: "standalone",
    lang: "es",
    background_color: "#f7f8fc",
    theme_color: "#5839be",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
