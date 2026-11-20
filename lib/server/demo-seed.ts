import { getD1 } from "../../db";
import { buildDemoStatements } from "../domain/demo-sql";

/**
 * Preparación de los datos ficticios de la demo.
 *
 * El SQL lo genera `lib/domain/demo-sql` (puro y sin entrada de usuario); este
 * servicio abre D1 y lo aplica en un único lote atómico. La ruta solo
 * comprueba la propiedad y responde.
 */

/** Resultado de preparar la demo. */
export type DemoSeedResult = { ok: true } | { ok: false; message: string };

/**
 * Aplica el lote idempotente de la demo.
 * @returns `ok` o el mensaje del contrato si el lote falla o colisiona.
 */
export async function seedDemoProject(): Promise<DemoSeedResult> {
  try {
    const db = getD1();
    await db.batch(buildDemoStatements().map((statement) => db.prepare(statement)));
    return { ok: true };
  } catch {
    return { ok: false, message: "No se pudo preparar la demo. No se han aplicado cambios; revisa posibles colisiones de identificadores." };
  }
}
