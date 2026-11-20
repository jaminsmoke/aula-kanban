import type { AulaDocument } from "./document";

/** Copias locales que se conservan antes de purgar las más antiguas. */
export const AULA_RECOVERY_MAX_COPIES = 3;

/** Tamaño total máximo del conjunto de copias en `localStorage`. */
export const AULA_RECOVERY_MAX_TOTAL_BYTES = 420_000;

/** Motivo por el que se creó una copia local. */
export const AULA_RECOVERY_REASONS = ["conflict", "replace"] as const;
export type AulaRecoveryReason = (typeof AULA_RECOVERY_REASONS)[number];

/** Etiquetas legibles de los motivos de recuperación. */
export const AULA_RECOVERY_REASON_LABELS: Record<AulaRecoveryReason, string> = {
  conflict: "Conflicto de versión",
  replace: "Antes de reemplazar",
};

/** Copia recuperable de un documento guardada en el navegador. */
export type AulaRecoveryCopy = {
  id: string;
  createdAt: number;
  reason: AulaRecoveryReason;
  title: string;
  serverUpdatedAt: number | null;
  document: AulaDocument;
};

/** Resultado de guardar una copia local. */
export type SaveAulaRecoveryResult =
  | { ok: true; copies: AulaRecoveryCopy[]; purged: number }
  | { ok: false; reason: "too-large" | "quota" };
