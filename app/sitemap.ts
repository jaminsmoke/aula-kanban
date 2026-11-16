import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/domain/site";

/**
 * Rutas públicas indexables. La portada, la documentación y las dos páginas
 * legales; el tablero, la API y el MCP quedan fuera a propósito.
 */
export const PUBLIC_PATHS = ["/", "/documentacion", "/privacidad", "/condiciones"] as const;

/**
 * Mapa del sitio público.
 * @returns Las entradas absolutas que vinext sirve en `/sitemap.xml`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
