/** Estado de carga del motor de cálculo. */
export type EngineStatus = "idle" | "loading" | "ready" | "error";

let current: EngineStatus = "idle";
const listeners = new Set<(status: EngineStatus) => void>();

/**
 * Estado actual del motor, sin esperar a que termine la carga.
 * @returns El último estado conocido.
 */
export function getEngineStatus(): EngineStatus {
  return current;
}

/**
 * Observa los cambios del estado del motor.
 * @param listener - Se llama con el estado actual y con cada cambio.
 * @returns La función para dejar de observar.
 */
export function subscribeEngineStatus(listener: (status: EngineStatus) => void): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Publica un estado nuevo y avisa a quien esté observando.
 * @param status - Estado que acaba de alcanzar el motor.
 */
export function setEngineStatus(status: EngineStatus): void {
  if (current === status) return;
  current = status;
  for (const listener of listeners) listener(status);
}
