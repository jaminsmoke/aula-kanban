import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Binding D1 en bruto, para el servidor MCP, que busca tokens con SQL directo.
 * @returns El binding D1 del entorno.
 */
export function getD1(): D1Database {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }
  return env.DB as D1Database;
}

/**
 * Conexión Drizzle con la base D1 del entorno.
 * @returns La instancia de Drizzle con el esquema completo.
 */
export function getDb() {
  return drizzle(getD1(), { schema });
}
