import { createLocalState } from "../../../../lib/client-storage";
import { emptyProgress, parseProgress, type TarjetasProgress } from "./tarjetas-model";

/**
 * Valida el progreso local de Tarjetas.
 * @param value - Valor candidato.
 * @returns El progreso válido o `null`.
 */
export function parseTarjetasProgress(value: unknown): TarjetasProgress | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const candidate = value as { version?: unknown; schedules?: unknown };
  if (candidate.version !== 1) return null;
  if (typeof candidate.schedules !== "object" || candidate.schedules === null || Array.isArray(candidate.schedules)) {
    return null;
  }
  return parseProgress(value);
}

/**
 * Crea el estado local versionado del progreso de Tarjetas.
 * @param projectId - Proyecto activo.
 * @returns El estado local listo para leer o escribir.
 */
export function createTarjetasProgressState(projectId: string) {
  return createLocalState<TarjetasProgress>({
    key: `aula-kanban-tarjetas:${projectId}`,
    version: 1,
    validate: parseTarjetasProgress,
    fallback: emptyProgress,
  });
}
