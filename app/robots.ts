import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/domain/site";

/**
 * Reglas de rastreo de la instancia: se indexa la superficie pública y se
 * dejan fuera la API, el MCP, el descubrimiento OAuth, la sesión y las
 * rutas de autorización.
 * @returns La configuración que vinext sirve en `/robots.txt`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/mcp", "/.well-known/", "/oauth/", "/sesion"],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
