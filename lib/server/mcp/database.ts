import { getD1 } from "../../../db";
import type { Db } from "../oauth/service";

/**
 * Abre la base D1 que usa el transporte MCP.
 * @returns La conexión, o `null` si el binding no está disponible.
 */
export function openMcpDatabase(): Db | null {
  try {
    return getD1();
  } catch {
    return null;
  }
}
